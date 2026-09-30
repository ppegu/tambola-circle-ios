#import "CircleProofImage.h"
#import <CoreGraphics/CoreGraphics.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <math.h>

static const CGFloat CircleProofMaxSide = 2000;        // PROOF_MAX_SIDE in shared/payments.ts
static const NSUInteger CircleProofMaxBytes = 1400000; // below MAX_PROOF_BYTES
static const NSUInteger CircleProofKeep = 5;

// Keeps what decoders need (APP0 JFIF, APP2 ICC profile, APP14 Adobe, tables,
// frame and scan) and drops APP1 (EXIF, XMP), which the server refuses, along
// with the other APPn and comment segments. Like the server (validJpeg in
// server/src/avatar-photos.ts) it wants one SOF0–2 frame and EOI at the end.
static NSData *CircleProofStrip(NSData *jpeg) {
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
static CGImageRef CircleProofFlatten(CGImageRef image, size_t width, size_t height) {
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

static NSData *CircleProofEncode(CGImageRef image, double quality) {
  NSMutableData *data = [NSMutableData data];
  CGImageDestinationRef destination = CGImageDestinationCreateWithData((__bridge CFMutableDataRef)data, (__bridge CFStringRef)UTTypeJPEG.identifier, 1, NULL);
  if (!destination) return nil;
  CGImageDestinationAddImage(destination, image, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageDestinationLossyCompressionQuality: @(quality)});
  BOOL written = CGImageDestinationFinalize(destination);
  CFRelease(destination);
  return written ? CircleProofStrip(data) : nil;
}

// ImageIO decodes only a downsized copy (the full-size image is never held) and
// applies the EXIF orientation. Quality steps down first, then the size.
static NSData *CircleProofJPEG(CGImageSourceRef source, size_t *outWidth, size_t *outHeight) {
  if (!source || CGImageSourceGetCount(source) < 1) return nil;
  CGImageRef image = CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)@{
    (__bridge id)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
    (__bridge id)kCGImageSourceCreateThumbnailWithTransform: @YES,
    (__bridge id)kCGImageSourceShouldCacheImmediately: @YES,
    (__bridge id)kCGImageSourceThumbnailMaxPixelSize: @(CircleProofMaxSide)
  });
  if (!image) return nil;
  size_t width = CGImageGetWidth(image), height = CGImageGetHeight(image);
  NSData *result = nil;
  for (double scale = 1; !result && width && height; scale *= 0.75) {
    size_t w = MAX((size_t)1, (size_t)llround(width * scale)), h = MAX((size_t)1, (size_t)llround(height * scale));
    CGImageRef flat = CircleProofFlatten(image, w, h);
    if (!flat) break;
    NSData *jpeg = nil;
    for (NSNumber *quality in @[@0.88, @0.8, @0.72, @0.64, @0.56]) {
      jpeg = CircleProofEncode(flat, quality.doubleValue);
      if (!jpeg || jpeg.length <= CircleProofMaxBytes) break;
    }
    CGImageRelease(flat);
    if (!jpeg) break;
    if (jpeg.length <= CircleProofMaxBytes) {
      result = jpeg;
      *outWidth = w;
      *outHeight = h;
    } else if (MAX(w, h) <= 600) break;
  }
  CGImageRelease(image);
  return result;
}

static NSDictionary<NSString *, id> *CircleProofSave(CGImageSourceRef source, NSError **error) {
  size_t width = 0, height = 0;
  NSData *jpeg = nil;
  @autoreleasepool {
    jpeg = CircleProofJPEG(source, &width, &height);
  }
  if (!jpeg) {
    if (error) *error = [NSError errorWithDomain:@"CircleProofImage" code:1 userInfo:@{NSLocalizedDescriptionKey: @"The image could not be read."}];
    return nil;
  }
  NSFileManager *files = NSFileManager.defaultManager;
  NSURL *folder = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:@"payment-proofs"] isDirectory:YES];
  if (![files createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:nil error:error]) return nil;
  NSURL *file = [folder URLByAppendingPathComponent:[NSUUID.UUID.UUIDString.lowercaseString stringByAppendingPathExtension:@"jpg"] isDirectory:NO];
  if (![jpeg writeToURL:file options:NSDataWritingAtomic error:error]) return nil;
  // Earlier proofs may still be on screen or uploading, so a few are kept.
  NSArray<NSURL *> *proofs = [files contentsOfDirectoryAtURL:folder includingPropertiesForKeys:@[NSURLContentModificationDateKey] options:NSDirectoryEnumerationSkipsHiddenFiles error:nil];
  proofs = [proofs sortedArrayUsingComparator:^NSComparisonResult(NSURL *a, NSURL *b) {
    NSDate *first = nil, *second = nil;
    [a getResourceValue:&first forKey:NSURLContentModificationDateKey error:nil];
    [b getResourceValue:&second forKey:NSURLContentModificationDateKey error:nil];
    return [(second ?: NSDate.distantPast) compare:(first ?: NSDate.distantPast)];
  }];
  for (NSUInteger i = CircleProofKeep; i < proofs.count; i++)
    if (![proofs[i].lastPathComponent isEqualToString:file.lastPathComponent]) [files removeItemAtURL:proofs[i] error:nil];
  return @{@"uri": file.absoluteString, @"width": @(width), @"height": @(height), @"bytes": @(jpeg.length)};
}

@implementation CircleProofImage
+ (NSDictionary<NSString *, id> *)proofFromURL:(NSURL *)url error:(NSError **)error {
  CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageSourceShouldCache: @NO});
  NSDictionary<NSString *, id> *proof = CircleProofSave(source, error);
  if (source) CFRelease(source);
  return proof;
}
+ (NSDictionary<NSString *, id> *)proofFromData:(NSData *)data error:(NSError **)error {
  CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)data, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageSourceShouldCache: @NO});
  NSDictionary<NSString *, id> *proof = CircleProofSave(source, error);
  if (source) CFRelease(source);
  return proof;
}
+ (NSData *)strippedJPEG:(NSData *)jpeg {
  return jpeg ? CircleProofStrip(jpeg) : nil;
}
@end
