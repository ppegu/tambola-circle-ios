#import "CircleTransactionScreenshotOperations.h"
#import "CircleTransactionScreenshot.h"
#import <Vision/Vision.h>
#import <ImageIO/ImageIO.h>

@interface CircleScreenshotUpload : NSObject <NSURLSessionTaskDelegate>
@property(nonatomic, strong) NSURLSession *session;
@property(nonatomic, strong) NSURLSessionUploadTask *task;
@property(nonatomic, strong) NSURL *file;
@property(nonatomic, copy) NSString *uri;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@property(nonatomic, copy) void (^progress)(NSDictionary *);
@property(nonatomic, copy) void (^finished)(CircleScreenshotUpload *);
@end

@implementation CircleScreenshotUpload
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didSendBodyData:(int64_t)bytesSent totalBytesSent:(int64_t)totalBytesSent totalBytesExpectedToSend:(int64_t)totalBytesExpectedToSend {
  if (self.progress) self.progress(@{@"uri":self.uri, @"loaded":@(totalBytesSent), @"total":@(MAX((int64_t)0, totalBytesExpectedToSend))});
}
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task willPerformHTTPRedirection:(NSHTTPURLResponse *)response newRequest:(NSURLRequest *)request completionHandler:(void (^)(NSURLRequest *))completionHandler {
  // A signed PUT is for one endpoint; never follow redirects with its headers/body.
  completionHandler(nil);
}
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential *))completionHandler {
  // Normal system TLS validation is allowed; never answer an HTTP/proxy auth challenge.
  completionHandler([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]
    ? NSURLSessionAuthChallengePerformDefaultHandling : NSURLSessionAuthChallengeCancelAuthenticationChallenge, nil);
}
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error {
  NSInteger status = [(NSHTTPURLResponse *)task.response statusCode];
  if (error) self.reject(error.code == NSURLErrorTimedOut ? @"SCREENSHOT_UPLOAD_TIMEOUT" : @"SCREENSHOT_UPLOAD", @"Could not upload the screenshot. Please try again.", error);
  else if (status == 401 || status == 403) self.reject(@"UPLOAD_URL_EXPIRED", @"The upload link expired. Please submit again.", nil);
  else if (status < 200 || status > 299) self.reject(@"SCREENSHOT_UPLOAD", [NSString stringWithFormat:@"Screenshot upload failed (HTTP %ld). Please try again.", (long)status], nil);
  else self.resolve(nil);
  [CircleTransactionScreenshot endAccess:self.file];
  if (self.finished) self.finished(self);
  [session finishTasksAndInvalidate];
  self.resolve = nil; self.reject = nil; self.progress = nil; self.finished = nil; self.task = nil; self.session = nil;
}
@end

@interface CircleTransactionScreenshotOperations ()
@property(nonatomic, strong) dispatch_queue_t io;
@property(nonatomic, strong) NSMutableDictionary<NSString *, CircleScreenshotUpload *> *uploads;
@property(nonatomic, strong) NSMutableSet<VNRecognizeTextRequest *> *scans;
@property(nonatomic) BOOL closed;
@end

@implementation CircleTransactionScreenshotOperations
- (instancetype)init {
  if ((self = [super init])) {
    _io = dispatch_queue_create("com.ppegu.circle.transaction-screenshots", DISPATCH_QUEUE_SERIAL);
    _uploads = [NSMutableDictionary new]; _scans = [NSMutableSet new];
  }
  return self;
}
- (void)retainScreenshot:(NSString *)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    NSError *error = nil;
    if ([CircleTransactionScreenshot retainScreenshot:uri error:&error]) resolve(nil);
    else reject(@"SCREENSHOT_READ", @"The screenshot is no longer available. Please share it again.", error);
  });
}
- (void)releaseScreenshot:(NSString *)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    NSError *error = nil;
    if ([CircleTransactionScreenshot releaseScreenshot:uri error:&error]) resolve(nil);
    else reject(@"SCREENSHOT_READ", @"Could not release this screenshot.", error);
  });
}
- (void)recognize:(NSString *)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    @autoreleasepool {
      NSError *error = nil;
      NSURL *file = [CircleTransactionScreenshot beginAccess:uri error:&error];
      if (!file) { reject(@"SCREENSHOT_READ", @"The screenshot is no longer available. Please share it again.", error); return; }
      VNRecognizeTextRequest *request = [VNRecognizeTextRequest new];
      request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
      request.usesLanguageCorrection = NO;
      request.automaticallyDetectsLanguage = YES;
      @synchronized(self) {
        if (self.closed) { [CircleTransactionScreenshot endAccess:file]; reject(@"SCREENSHOT_OCR", @"Screenshot scan was cancelled.", nil); return; }
        [self.scans addObject:request];
      }
      dispatch_block_t deadline = dispatch_block_create(0, ^{ [request cancel]; });
      dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 45 * NSEC_PER_SEC), dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), deadline);
      VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithURL:file options:@{}];
      BOOL read = [handler performRequests:@[request] error:&error];
      dispatch_block_cancel(deadline);
      @synchronized(self) { [self.scans removeObject:request]; }
      if (!read || error) reject(@"SCREENSHOT_OCR", @"Could not read the Transaction ID. Please scan again or share a clearer screenshot.", error);
      else {
        NSMutableArray *lines = [NSMutableArray new];
        for (VNRecognizedTextObservation *line in request.results) {
          NSString *text = [line topCandidates:1].firstObject.string;
          if (!text.length) continue;
          if (text.length > 1000) text = [text substringToIndex:1000];
          CGRect box = line.boundingBox;
          double x = MAX(0, MIN(1, box.origin.x)), y = MAX(0, MIN(1, 1 - CGRectGetMaxY(box)));
          [lines addObject:@{@"text":text, @"x":@(x), @"y":@(y), @"width":@(MAX(0, MIN(1-x, box.size.width))), @"height":@(MAX(0, MIN(1-y, box.size.height)))}];
          if (lines.count >= 400) break;
        }
        resolve(lines);
      }
      [CircleTransactionScreenshot endAccess:file];
    }
  });
}
- (void)upload:(NSString *)uri url:(NSString *)url headers:(NSDictionary *)headers progress:(void (^)(NSDictionary *))progress resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    NSURL *endpoint = [NSURL URLWithString:url];
    BOOL valid = url.length <= 8192 && [endpoint.scheme isEqualToString:@"https"] && endpoint.host.length && !endpoint.user && !endpoint.password && !endpoint.fragment && headers.count <= 16;
    NSCharacterSet *headerCharacters = [NSCharacterSet characterSetWithCharactersInString:@"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-"];
    for (id name in headers) {
      id value = headers[name];
      if (![name isKindOfClass:NSString.class] || ![value isKindOfClass:NSString.class]) { valid = NO; break; }
      NSString *key = [name lowercaseString];
      valid = valid && [name length] > 0 && [name length] <= 100 && [name rangeOfCharacterFromSet:headerCharacters.invertedSet].location == NSNotFound
        && [value length] <= 2048 && [value rangeOfCharacterFromSet:NSCharacterSet.newlineCharacterSet].location == NSNotFound
        && ([key isEqualToString:@"content-type"] || [key isEqualToString:@"content-length"] || [key isEqualToString:@"content-md5"] || [key hasPrefix:@"x-amz-"]);
      if ([key isEqualToString:@"content-type"] && ![value isEqualToString:@"image/jpeg"]) valid = NO;
    }
    if (!valid) { reject(@"SCREENSHOT_UPLOAD", @"Invalid screenshot upload URL or headers.", nil); return; }
    NSError *error = nil;
    NSURL *file = [CircleTransactionScreenshot beginAccess:uri error:&error];
    if (!file) { reject(@"SCREENSHOT_READ", @"The screenshot is no longer available. Please share it again.", error); return; }
    NSNumber *bytes = nil; [file getResourceValue:&bytes forKey:NSURLFileSizeKey error:nil];
    for (NSString *name in headers) {
      if ([name.lowercaseString isEqualToString:@"content-length"] && ![headers[name] isEqualToString:bytes.stringValue]) {
        [CircleTransactionScreenshot endAccess:file]; reject(@"SCREENSHOT_UPLOAD", @"Screenshot upload size does not match the image.", nil); return;
      }
    }
    CircleScreenshotUpload *upload = [CircleScreenshotUpload new];
    upload.file = file; upload.uri = uri; upload.resolve = resolve; upload.reject = reject; upload.progress = progress;
    __weak CircleTransactionScreenshotOperations *weakSelf = self;
    upload.finished = ^(CircleScreenshotUpload *done) {
      CircleTransactionScreenshotOperations *owner = weakSelf;
      @synchronized(owner) { if (owner.uploads[uri] == done) [owner.uploads removeObjectForKey:uri]; }
    };
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:endpoint];
    request.HTTPMethod = @"PUT"; request.HTTPShouldHandleCookies = NO;
    [request setValue:@"image/jpeg" forHTTPHeaderField:@"Content-Type"];
    for (NSString *name in headers) [request setValue:headers[name] forHTTPHeaderField:name];
    NSURLSessionConfiguration *configuration = NSURLSessionConfiguration.ephemeralSessionConfiguration;
    configuration.timeoutIntervalForRequest = 60; configuration.timeoutIntervalForResource = 90;
    configuration.HTTPShouldSetCookies = NO; configuration.HTTPCookieStorage = nil; configuration.URLCredentialStorage = nil; configuration.URLCache = nil;
    @synchronized(self) {
      if (self.closed || self.uploads[uri]) { [CircleTransactionScreenshot endAccess:file]; reject(@"SCREENSHOT_UPLOAD", @"This screenshot is already uploading or the app was closed.", nil); return; }
      upload.session = [NSURLSession sessionWithConfiguration:configuration delegate:upload delegateQueue:nil];
      upload.task = [upload.session uploadTaskWithRequest:request fromFile:file];
      self.uploads[uri] = upload;
      if (progress) progress(@{@"uri":uri, @"loaded":@0, @"total":bytes ?: @0});
      [upload.task resume];
    }
  });
}
- (void)close {
  @synchronized(self) {
    self.closed = YES;
    for (VNRecognizeTextRequest *request in self.scans) [request cancel];
    for (CircleScreenshotUpload *upload in self.uploads.allValues) [upload.session invalidateAndCancel];
  }
}
@end
