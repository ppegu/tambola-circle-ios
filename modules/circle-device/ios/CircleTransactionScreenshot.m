#import "CircleTransactionScreenshot.h"
#import <CoreGraphics/CoreGraphics.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <math.h>
#import <CommonCrypto/CommonDigest.h>

static const CGFloat CircleScreenshotMaxSide = 2000;        // SCREENSHOT_MAX_SIDE in shared/transactions.ts
static const NSUInteger CircleScreenshotMaxBytes = 1400000; // below MAX_SCREENSHOT_BYTES
static const NSUInteger CircleScreenshotKeep = 5;
static NSMutableDictionary<NSString *, NSNumber *> *CircleScreenshotAccess;

static NSURL *CircleScreenshotFolder(void) {
  return [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:@"payment-proofs"] isDirectory:YES];
}
static BOOL CircleScreenshotName(NSString *name) {
  if (![name.pathExtension isEqualToString:@"jpg"] || name.length != 40) return NO;
  NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:name.stringByDeletingPathExtension];
  return uuid && [uuid.UUIDString.lowercaseString isEqualToString:name.stringByDeletingPathExtension];
}
static NSMutableDictionary *CircleScreenshotPins(void) {
  NSURL *file = [CircleScreenshotFolder() URLByAppendingPathComponent:@".pins.json"];
  NSNumber *bytes = nil; [file getResourceValue:&bytes forKey:NSURLFileSizeKey error:nil];
  if (bytes.unsignedIntegerValue > 262144) return [NSMutableDictionary new];
  NSData *data = [NSData dataWithContentsOfURL:file];
  id value = data ? [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingMutableContainers error:nil] : nil;
  return [value isKindOfClass:NSMutableDictionary.class] ? value : [NSMutableDictionary new];
}
static BOOL CircleScreenshotSavePins(NSDictionary *pins, NSError **error) {
  NSData *data = [NSJSONSerialization dataWithJSONObject:pins options:0 error:error];
  return data && [data writeToURL:[CircleScreenshotFolder() URLByAppendingPathComponent:@".pins.json"] options:NSDataWritingAtomic error:error];
}
static void CircleScreenshotTrim(void) {
  NSFileManager *files = NSFileManager.defaultManager;
  NSMutableDictionary *pins = CircleScreenshotPins(); NSTimeInterval now = NSDate.date.timeIntervalSince1970;
  for (NSString *name in pins.allKeys) {
    id expiry = pins[name];
    if (!CircleScreenshotName(name) || ![expiry isKindOfClass:NSNumber.class] || [expiry doubleValue] <= now || ![files fileExistsAtPath:[CircleScreenshotFolder() URLByAppendingPathComponent:name].path]) [pins removeObjectForKey:name];
  }
  // If persistence fails, keep files rather than lose a retained draft.
  if (!CircleScreenshotSavePins(pins, nil)) return;
  NSArray<NSURL *> *entries = [files contentsOfDirectoryAtURL:CircleScreenshotFolder() includingPropertiesForKeys:@[NSURLContentModificationDateKey, NSURLIsSymbolicLinkKey] options:NSDirectoryEnumerationSkipsHiddenFiles error:nil];
  entries = [entries sortedArrayUsingComparator:^NSComparisonResult(NSURL *a, NSURL *b) {
    NSDate *first = nil, *second = nil;
    [a getResourceValue:&first forKey:NSURLContentModificationDateKey error:nil];
    [b getResourceValue:&second forKey:NSURLContentModificationDateKey error:nil];
    return [(second ?: NSDate.distantPast) compare:(first ?: NSDate.distantPast)];
  }];
  NSUInteger unretained = 0;
  for (NSURL *file in entries) {
    NSString *name = file.lastPathComponent; NSNumber *link = nil;
    [file getResourceValue:&link forKey:NSURLIsSymbolicLinkKey error:nil];
    if (!CircleScreenshotName(name) || link.boolValue || pins[name] || CircleScreenshotAccess[name]) continue;
    if (++unretained > CircleScreenshotKeep) [files removeItemAtURL:file error:nil];
  }
}
static NSError *CircleScreenshotError(void) {
  return [NSError errorWithDomain:@"CircleTransactionScreenshot" code:2 userInfo:@{NSLocalizedDescriptionKey:@"The screenshot is no longer available. Please share it again."}];
}

// Keeps what decoders need (APP0 JFIF, APP2 ICC profile, APP14 Adobe, tables,
// frame and scan) and drops APP1 (EXIF, XMP), which the server refuses, along
// with the other APPn and comment segments. Like the server (validJpeg in
// server/src/avatar-photos.ts) it wants one SOF0–2 frame and EOI at the end.
static NSData *CircleScreenshotStrip(NSData *jpeg) {
  const uint8_t *bytes = jpeg.bytes;
  NSUInteger length = jpeg.length;
  if (length < 20 || bytes[0] != 0xFF || bytes[1] != 0xD8 || bytes[length - 2] != 0xFF || bytes[length - 1] != 0xD9) return nil;
  NSMutableData *result = [NSMutableData dataWithCapacity:length];
  [result appendBytes:bytes length:2];
  NSUInteger frames = 0;
  for (NSUInteger i = 2; i + 4 <= length;) {
    if (bytes[i] != 0xFF) return nil;
    uint8_t marker = bytes[i + 1];
    if (marker == 0xFF) { i++; continue; } // fill byte
    if (marker == 0xDA) { // start of scan: image data up to EOI
      if (frames != 1) return nil;
      [result appendBytes:bytes + i length:length - i];
      return result;
    }
    if (marker == 0x00 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) return nil;
    NSUInteger size = ((NSUInteger)bytes[i + 2] << 8) | bytes[i + 3];
    if (size < 2 || i + 2 + size > length) return nil;
    BOOL frame = marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;
    if (frame && (marker > 0xC2 || size < 8 || ++frames > 1)) return nil;
    BOOL metadata = marker == 0xFE || (marker >= 0xE1 && marker <= 0xEF && marker != 0xE2 && marker != 0xEE);
    if (!metadata) [result appendBytes:bytes + i length:2 + size];
    i += 2 + size;
  }
  return nil;
}

// JPEG has no transparency: draw on white, in sRGB.
static CGImageRef CircleScreenshotFlatten(CGImageRef image, size_t width, size_t height) {
  CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
  CGContextRef context = CGBitmapContextCreate(NULL, width, height, 8, 0, space, (CGBitmapInfo)kCGImageAlphaNoneSkipLast);
  CGColorSpaceRelease(space);
  if (!context) return NULL;
  CGRect bounds = CGRectMake(0, 0, (CGFloat)width, (CGFloat)height);
  CGContextSetRGBFillColor(context, 1, 1, 1, 1);
  CGContextFillRect(context, bounds);
  CGContextSetInterpolationQuality(context, kCGInterpolationHigh);
  CGContextDrawImage(context, bounds, image);
  CGImageRef flat = CGBitmapContextCreateImage(context);
  CGContextRelease(context);
  return flat;
}

static NSData *CircleScreenshotEncode(CGImageRef image, double quality) {
  NSMutableData *data = [NSMutableData data];
  CGImageDestinationRef destination = CGImageDestinationCreateWithData((__bridge CFMutableDataRef)data, (__bridge CFStringRef)UTTypeJPEG.identifier, 1, NULL);
  if (!destination) return nil;
  CGImageDestinationAddImage(destination, image, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageDestinationLossyCompressionQuality: @(quality)});
  BOOL written = CGImageDestinationFinalize(destination);
  CFRelease(destination);
  return written ? CircleScreenshotStrip(data) : nil;
}

// ImageIO decodes only a downsized copy (the full-size image is never held) and
// applies the EXIF orientation. Quality steps down first, then the size.
static NSData *CircleScreenshotJPEG(CGImageSourceRef source, size_t *outWidth, size_t *outHeight) {
  if (!source || CGImageSourceGetCount(source) < 1) return nil;
  CGImageRef image = CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)@{
    (__bridge id)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
    (__bridge id)kCGImageSourceCreateThumbnailWithTransform: @YES,
    (__bridge id)kCGImageSourceShouldCacheImmediately: @YES,
    (__bridge id)kCGImageSourceThumbnailMaxPixelSize: @(CircleScreenshotMaxSide)
  });
  if (!image) return nil;
  size_t width = CGImageGetWidth(image), height = CGImageGetHeight(image);
  NSData *result = nil;
  for (double scale = 1; !result && width && height; scale *= 0.75) {
    size_t w = MAX((size_t)1, (size_t)llround(width * scale)), h = MAX((size_t)1, (size_t)llround(height * scale));
    CGImageRef flat = CircleScreenshotFlatten(image, w, h);
    if (!flat) break;
    NSData *jpeg = nil;
    for (NSNumber *quality in @[@0.88, @0.8, @0.72, @0.64, @0.56]) {
      jpeg = CircleScreenshotEncode(flat, quality.doubleValue);
      if (!jpeg || jpeg.length <= CircleScreenshotMaxBytes) break;
    }
    CGImageRelease(flat);
    if (!jpeg) break;
    if (jpeg.length <= CircleScreenshotMaxBytes) {
      result = jpeg;
      *outWidth = w;
      *outHeight = h;
    } else if (MAX(w, h) <= 600) break;
  }
  CGImageRelease(image);
  return result;
}

static NSDictionary<NSString *, id> *CircleScreenshotSave(CGImageSourceRef source, NSError **error) {
  size_t width = 0, height = 0;
  NSData *jpeg = nil;
  @autoreleasepool {
    jpeg = CircleScreenshotJPEG(source, &width, &height);
  }
  if (!jpeg) {
    if (error) *error = [NSError errorWithDomain:@"CircleTransactionScreenshot" code:1 userInfo:@{NSLocalizedDescriptionKey: @"The image could not be read."}];
    return nil;
  }
  NSFileManager *files = NSFileManager.defaultManager;
  NSURL *folder = CircleScreenshotFolder();
  if (![files createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:nil error:error]) return nil;
  NSURL *file = [folder URLByAppendingPathComponent:[NSUUID.UUID.UUIDString.lowercaseString stringByAppendingPathExtension:@"jpg"] isDirectory:NO];
  @synchronized(CircleTransactionScreenshot.class) {
    if (![jpeg writeToURL:file options:NSDataWritingAtomic error:error]) return nil;
    NSMutableDictionary *pins = CircleScreenshotPins();
    pins[file.lastPathComponent] = @(NSDate.date.timeIntervalSince1970 + 15 * 60);
    if (!CircleScreenshotSavePins(pins, error)) return nil;
    CircleScreenshotTrim();
  }
  unsigned char digest[CC_SHA256_DIGEST_LENGTH]; CC_SHA256(jpeg.bytes, (CC_LONG)jpeg.length, digest);
  NSMutableString *hash = [NSMutableString stringWithCapacity:64];
  for (NSUInteger i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) [hash appendFormat:@"%02x", digest[i]];
  return @{@"uri": file.absoluteString, @"width": @(width), @"height": @(height), @"bytes": @(jpeg.length), @"sha256": hash};
}

@implementation CircleTransactionScreenshot
+ (NSURL *)localURL:(NSString *)uri error:(NSError **)error {
  NSURL *url = [NSURL URLWithString:uri];
  NSURL *folder = CircleScreenshotFolder().URLByResolvingSymlinksInPath;
  NSNumber *regular = nil, *link = nil, *bytes = nil;
  BOOL valid = url.isFileURL && !url.host.length && !url.query && !url.fragment && CircleScreenshotName(url.lastPathComponent)
    && [url.URLByResolvingSymlinksInPath.URLByDeletingLastPathComponent.path isEqualToString:folder.path]
    && [url getResourceValue:&regular forKey:NSURLIsRegularFileKey error:nil] && regular.boolValue
    && [url getResourceValue:&link forKey:NSURLIsSymbolicLinkKey error:nil] && !link.boolValue
    && [url getResourceValue:&bytes forKey:NSURLFileSizeKey error:nil] && bytes.unsignedLongLongValue > 0 && bytes.unsignedLongLongValue <= CircleScreenshotMaxBytes;
  if (!valid) { if (error) *error = CircleScreenshotError(); return nil; }
  return url;
}
+ (BOOL)retainScreenshot:(NSString *)uri error:(NSError **)error {
  @synchronized(self) {
    NSURL *url = [self localURL:uri error:error]; if (!url) return NO;
    NSMutableDictionary *pins = CircleScreenshotPins(); pins[url.lastPathComponent] = @(NSDate.distantFuture.timeIntervalSince1970);
    return CircleScreenshotSavePins(pins, error);
  }
}
+ (BOOL)releaseScreenshot:(NSString *)uri error:(NSError **)error {
  @synchronized(self) {
    NSURL *url = [NSURL URLWithString:uri];
    if (!url.isFileURL || url.host.length || url.query || url.fragment || !CircleScreenshotName(url.lastPathComponent)
      || ![url.URLByResolvingSymlinksInPath.URLByDeletingLastPathComponent.path isEqualToString:CircleScreenshotFolder().URLByResolvingSymlinksInPath.path]) { if (error) *error = CircleScreenshotError(); return NO; }
    if (![NSFileManager.defaultManager fileExistsAtPath:CircleScreenshotFolder().path]) return YES;
    NSMutableDictionary *pins = CircleScreenshotPins(); [pins removeObjectForKey:url.lastPathComponent];
    if (!CircleScreenshotSavePins(pins, error)) return NO;
    CircleScreenshotTrim(); return YES;
  }
}
+ (NSURL *)beginAccess:(NSString *)uri error:(NSError **)error {
  @synchronized(self) {
    NSURL *url = [self localURL:uri error:error]; if (!url) return nil;
    if (!CircleScreenshotAccess) CircleScreenshotAccess = [NSMutableDictionary new];
    CircleScreenshotAccess[url.lastPathComponent] = @(CircleScreenshotAccess[url.lastPathComponent].unsignedIntegerValue + 1);
    return url;
  }
}
+ (void)endAccess:(NSURL *)url {
  @synchronized(self) {
    NSString *name = url.lastPathComponent; NSUInteger count = CircleScreenshotAccess[name].unsignedIntegerValue;
    if (count > 1) CircleScreenshotAccess[name] = @(count - 1); else [CircleScreenshotAccess removeObjectForKey:name];
    CircleScreenshotTrim();
  }
}
+ (NSDictionary<NSString *, id> *)screenshotFromURL:(NSURL *)url error:(NSError **)error {
  CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageSourceShouldCache: @NO});
  NSDictionary<NSString *, id> *screenshot = CircleScreenshotSave(source, error);
  if (source) CFRelease(source);
  return screenshot;
}
+ (NSDictionary<NSString *, id> *)screenshotFromData:(NSData *)data error:(NSError **)error {
  CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)data, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageSourceShouldCache: @NO});
  NSDictionary<NSString *, id> *screenshot = CircleScreenshotSave(source, error);
  if (source) CFRelease(source);
  return screenshot;
}
+ (NSData *)strippedJPEG:(NSData *)jpeg {
  return jpeg ? CircleScreenshotStrip(jpeg) : nil;
}
@end
