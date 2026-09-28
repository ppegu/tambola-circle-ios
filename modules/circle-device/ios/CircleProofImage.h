#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Payment screenshots (ProofImage in modules/circle-device/index.ts): at most
 * 2000 px on the longest side with the EXIF orientation applied, flattened on
 * white and re-encoded as a JPEG of at most 1,400,000 bytes without metadata.
 * Written to NSTemporaryDirectory()/payment-proofs/<uuid>.jpg, keeping the
 * newest five. Results are {uri (file://), width, height, bytes}.
 */
@interface CircleProofImage : NSObject
+ (nullable NSDictionary<NSString *, id> *)proofFromURL:(NSURL *)url error:(NSError **)error;
+ (nullable NSDictionary<NSString *, id> *)proofFromData:(NSData *)data error:(NSError **)error;
/** The JPEG without APP1 (EXIF, XMP) or other metadata segments; nil when malformed. */
+ (nullable NSData *)strippedJPEG:(nullable NSData *)jpeg;
@end

NS_ASSUME_NONNULL_END
