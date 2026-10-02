#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface CircleVoiceStorage : NSObject
- (void)inspect:(NSString *)voice revision:(NSString *)revision files:(NSArray *)files resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)download:(NSDictionary *)request resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)cancel:(NSString *)token;
- (void)finish:(NSString *)token;
- (void)remove:(NSString *)voice resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)freeBytes:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)close;
@end
