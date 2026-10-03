#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Shared screenshots (TransactionScreenshot in modules/circle-device/index.ts): at most
 * 2000 px on the longest side with the EXIF orientation applied, flattened on
 * white and re-encoded as a JPEG of at most 1,400,000 bytes without metadata.
 * Written to NSTemporaryDirectory()/payment-proofs/<uuid>.jpg, keeping the
 * newest five unretained files. Results include SHA-256 of the final JPEG.
 */
@interface CircleTransactionScreenshot : NSObject
+ (nullable NSDictionary<NSString *, id> *)screenshotFromURL:(NSURL *)url error:(NSError **)error;
+ (nullable NSDictionary<NSString *, id> *)screenshotFromData:(NSData *)data error:(NSError **)error;
/** The JPEG without APP1 (EXIF, XMP) or other metadata segments; nil when malformed. */
+ (nullable NSData *)strippedJPEG:(nullable NSData *)jpeg;
+ (nullable NSURL *)localURL:(NSString *)uri error:(NSError **)error;
+ (BOOL)retainScreenshot:(NSString *)uri error:(NSError **)error;
+ (BOOL)releaseScreenshot:(NSString *)uri error:(NSError **)error;
+ (nullable NSURL *)beginAccess:(NSString *)uri error:(NSError **)error;
+ (void)endAccess:(NSURL *)url;
@end

NS_ASSUME_NONNULL_END
