#import "CircleVoiceStorage.h"
#import <CommonCrypto/CommonDigest.h>
#import <math.h>

static BOOL matches(NSString *text, NSString *pattern) {
  return [text isKindOfClass:NSString.class] && [text rangeOfString:pattern options:NSRegularExpressionSearch].location != NSNotFound;
}
static NSError *voiceError(NSString *message) {
  return [NSError errorWithDomain:@"CallerVoiceStorage" code:1 userInfo:@{NSLocalizedDescriptionKey: message}];
}
static BOOL validEntry(NSDictionary *item) {
  if (![item isKindOfClass:NSDictionary.class] || ![item[@"number"] isKindOfClass:NSNumber.class] || ![item[@"bytes"] isKindOfClass:NSNumber.class]) return NO;
  double number = [item[@"number"] doubleValue], bytes = [item[@"bytes"] doubleValue];
  return number >= 1 && number <= 90 && number == floor(number) && bytes >= 44 && bytes <= 1000000 && bytes == floor(bytes) && matches(item[@"sha256"], @"^[a-f0-9]{64}$");
}
static BOOL verified(NSURL *url, NSDictionary *item) {
  NSDictionary *attributes = [NSFileManager.defaultManager attributesOfItemAtPath:url.path error:nil];
  if (![attributes[NSFileType] isEqual:NSFileTypeRegular] || [attributes[NSFileSize] unsignedLongLongValue] != [item[@"bytes"] unsignedLongLongValue]) return NO;
  NSData *data = [NSData dataWithContentsOfURL:url options:NSDataReadingMappedIfSafe error:nil];
  if (!data) return NO;
  unsigned char digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
  NSMutableString *hash = [NSMutableString new];
  for (NSUInteger i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) [hash appendFormat:@"%02x", digest[i]];
  return [hash isEqualToString:item[@"sha256"]];
}

@interface CircleVoiceStorage ()
@property(nonatomic, strong) dispatch_queue_t io;
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSURLSessionDownloadTask *> *tasks;
@property(nonatomic, strong) NSMutableSet<NSString *> *cancelled;
@end

@implementation CircleVoiceStorage
- (instancetype)init {
  if ((self = [super init])) {
    _io = dispatch_queue_create("com.ppegu.caller-voice-storage", DISPATCH_QUEUE_SERIAL);
    _tasks = [NSMutableDictionary new]; _cancelled = [NSMutableSet new];
  }
  return self;
}
- (NSURL *)root:(NSError **)error {
  NSURL *support = [NSFileManager.defaultManager URLForDirectory:NSApplicationSupportDirectory inDomain:NSUserDomainMask appropriateForURL:nil create:YES error:error];
  if (!support) return nil;
  NSURL *root = [support URLByAppendingPathComponent:@"caller-voices" isDirectory:YES];
  if (![NSFileManager.defaultManager createDirectoryAtURL:root withIntermediateDirectories:YES attributes:nil error:error]) return nil;
  // Downloadable assets remain offline without needlessly enlarging iCloud backups.
  [root setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:nil];
  return root;
}
- (NSURL *)pack:(NSString *)voice revision:(NSString *)revision error:(NSError **)error {
  if (![@[@"neerja", @"ava", @"emma", @"sonia"] containsObject:voice] || (revision && !matches(revision, @"^[a-f0-9]{16}$"))) {
    *error = voiceError(@"Invalid optional voice pack"); return nil;
  }
  NSURL *root = [self root:error]; if (!root) return nil;
  NSURL *pack = [root URLByAppendingPathComponent:voice isDirectory:YES];
  return revision ? [pack URLByAppendingPathComponent:revision isDirectory:YES] : pack;
}
- (void)inspect:(NSString *)voice revision:(NSString *)revision files:(NSArray *)files resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    NSError *error = nil; NSURL *directory = [self pack:voice revision:revision error:&error];
    if (!directory || files.count != 90) { reject(@"VOICE_STORAGE", @"Invalid voice pack", error); return; }
    NSMutableSet *numbers = [NSMutableSet new]; NSMutableArray *uris = [NSMutableArray new];
    for (NSDictionary *item in files) {
      if (!validEntry(item) || [numbers containsObject:item[@"number"]]) { reject(@"VOICE_STORAGE", @"Invalid voice file", nil); return; }
      [numbers addObject:item[@"number"]];
      NSURL *file = [directory URLByAppendingPathComponent:[NSString stringWithFormat:@"%@.wav", item[@"number"]]];
      if (!verified(file, item)) { resolve(nil); return; }
      [uris addObject:file.absoluteString];
    }
    resolve(uris);
  });
}
- (BOOL)isCancelled:(NSString *)token { @synchronized(self) { return [self.cancelled containsObject:token]; } }
- (void)download:(NSDictionary *)request resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    NSString *voice = request[@"id"], *revision = request[@"revision"], *token = request[@"token"];
    if (!validEntry(request) || !matches(token, @"^[a-z0-9-]{1,80}$")) { reject(@"VOICE_DOWNLOAD", @"Invalid voice request", nil); return; }
    NSError *error = nil; NSURL *directory = [self pack:voice revision:revision error:&error];
    if (!directory) { reject(@"VOICE_DOWNLOAD", error.localizedDescription, error); return; }
    NSURL *url = [NSURL URLWithString:request[@"url"]];
    NSString *expected = [NSString stringWithFormat:@"/packs/%@/%@/%@.wav", voice, revision, request[@"number"]];
    if (![url.scheme isEqualToString:@"https"] || ![url.host isEqualToString:@"tambola-circle-voices.ffegu0617.workers.dev"] || url.port || url.user || url.password || url.query || url.fragment || ![url.path isEqualToString:expected]) {
      reject(@"VOICE_DOWNLOAD", @"Invalid voice download URL", nil); return;
    }
    if ([self isCancelled:token]) { reject(@"CANCELLED", @"Download cancelled", nil); return; }
    NSURL *file = [directory URLByAppendingPathComponent:[NSString stringWithFormat:@"%@.wav", request[@"number"]]];
    if (verified(file, request)) { resolve(file.absoluteString); return; }
    if (![NSFileManager.defaultManager createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:&error]) { reject(@"VOICE_STORAGE", @"Could not create voice storage", error); return; }
    NSDictionary *space = [NSFileManager.defaultManager attributesOfFileSystemForPath:directory.path error:&error];
    if (!space || [space[NSFileSystemFreeSize] unsignedLongLongValue] < [request[@"bytes"] unsignedLongLongValue] + 1048576) { reject(@"VOICE_STORAGE", @"Not enough storage. Free some space and retry.", error); return; }
    NSMutableURLRequest *download = [NSMutableURLRequest requestWithURL:url cachePolicy:NSURLRequestReloadIgnoringLocalCacheData timeoutInterval:25];
    [download setValue:@"identity" forHTTPHeaderField:@"Accept-Encoding"];
    NSURLSessionDownloadTask *task = [NSURLSession.sharedSession downloadTaskWithRequest:download completionHandler:^(NSURL *temporary, NSURLResponse *response, NSError *failure) {
      @synchronized(self) { [self.tasks removeObjectForKey:token]; }
      if ([self isCancelled:token]) { reject(@"CANCELLED", @"Download cancelled", nil); return; }
      if (failure || !temporary || ![response isKindOfClass:NSHTTPURLResponse.class] || ((NSHTTPURLResponse *)response).statusCode != 200 || ![response.URL.absoluteString isEqualToString:url.absoluteString]) {
        reject(@"VOICE_DOWNLOAD", @"Voice download unavailable. Check your connection and retry.", failure); return;
      }
      if (!verified(temporary, request)) { reject(@"VOICE_DOWNLOAD", @"Voice file verification failed. Please retry.", nil); return; }
      NSError *saveError = nil;
      @synchronized(self) {
        if ([self.cancelled containsObject:token]) { reject(@"CANCELLED", @"Download cancelled", nil); return; }
        if ([NSFileManager.defaultManager fileExistsAtPath:file.path] && ![NSFileManager.defaultManager removeItemAtURL:file error:&saveError]) { reject(@"VOICE_STORAGE", @"Could not replace voice file", saveError); return; }
        if (![NSFileManager.defaultManager moveItemAtURL:temporary toURL:file error:&saveError]) { reject(@"VOICE_STORAGE", @"Could not save voice file", saveError); return; }
      }
      resolve(file.absoluteString);
    }];
    @synchronized(self) {
      if ([self.cancelled containsObject:token]) { [task cancel]; reject(@"CANCELLED", @"Download cancelled", nil); return; }
      self.tasks[token] = task; [task resume];
    }
  });
}
- (void)cancel:(NSString *)token { @synchronized(self) { [self.cancelled addObject:token]; [self.tasks[token] cancel]; } }
- (void)finish:(NSString *)token { @synchronized(self) { [self.cancelled removeObject:token]; } }
- (void)remove:(NSString *)voice resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    NSError *error = nil; NSURL *directory = [self pack:voice revision:nil error:&error];
    if (!directory) { reject(@"VOICE_STORAGE", error.localizedDescription, error); return; }
    if ([NSFileManager.defaultManager fileExistsAtPath:directory.path] && ![NSFileManager.defaultManager removeItemAtURL:directory error:&error]) { reject(@"VOICE_STORAGE", @"Could not remove voice", error); return; }
    resolve(nil);
  });
}
- (void)freeBytes:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(self.io, ^{
    NSError *error = nil; NSURL *root = [self root:&error];
    NSDictionary *attributes = root ? [NSFileManager.defaultManager attributesOfFileSystemForPath:root.path error:&error] : nil;
    if (!attributes) reject(@"VOICE_STORAGE", @"Could not check available storage", error); else resolve(attributes[NSFileSystemFreeSize]);
  });
}
- (void)close { @synchronized(self) { for (NSString *token in self.tasks.allKeys) { [self.cancelled addObject:token]; [self.tasks[token] cancel]; } } }
@end
