#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN
@interface CircleTransactionScreenshotOperations : NSObject
- (void)recognize:(NSString *)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)retainScreenshot:(NSString *)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)releaseScreenshot:(NSString *)uri resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)upload:(NSString *)uri url:(NSString *)url headers:(NSDictionary *)headers progress:(void (^)(NSDictionary *event))progress resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)close;
@end
NS_ASSUME_NONNULL_END
