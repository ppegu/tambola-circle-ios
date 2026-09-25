#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <AVFoundation/AVFoundation.h>
#import <Security/Security.h>
#import <UIKit/UIKit.h>
#import <sys/utsname.h>
#import <math.h>
#import "CircleVoiceStorage.h"

@interface CircleClip : NSObject
@property(nonatomic, strong) AVAudioPlayer *player;
@property(nonatomic, strong) NSURLSessionDataTask *task;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@end
@implementation CircleClip
@end

@interface CircleDevice : RCTEventEmitter <RCTBridgeModule, AVAudioPlayerDelegate>
@property(nonatomic, strong) NSMutableDictionary<NSString *, CircleClip *> *clips;
@property(nonatomic, strong) AVAudioPlayer *mediaKeepAlive;
@property(nonatomic) BOOL audioRequested;
@property(nonatomic) BOOL chatRequested;
@property(nonatomic) BOOL audioListeners;
@property(nonatomic) float voiceVolume;
@property(nonatomic, strong) CircleVoiceStorage *voiceStorage;
@end

@implementation CircleDevice
RCT_EXPORT_MODULE(CircleDevice)
RCT_EXPORT_METHOD(haptic) { UIImpactFeedbackGenerator *feedback = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleLight]; [feedback impactOccurred]; }
+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents { return @[@"CircleAudioInterrupted"]; }
- (void)startObserving { self.audioListeners = YES; }
- (void)stopObserving { self.audioListeners = NO; }
- (instancetype)init {
  if ((self = [super init])) {
    _clips = [NSMutableDictionary new];
    _voiceVolume = 1.0f;
    _voiceStorage = [CircleVoiceStorage new];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(suspendAudio) name:UIApplicationWillResignActiveNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(interrupted:) name:AVAudioSessionInterruptionNotification object:nil];
  }
  return self;
}
- (void)dealloc { [[NSNotificationCenter defaultCenter] removeObserver:self]; }
- (void)invalidate { [self.voiceStorage close]; dispatch_async(dispatch_get_main_queue(), ^{ [self suspendAudio]; }); [super invalidate]; }

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(randomHex:(double)size) {
  if (size < 0 || size > 1024 || floor(size) != size) @throw [NSException exceptionWithName:NSInvalidArgumentException reason:@"Invalid random byte count" userInfo:nil];
  NSMutableData *data = [NSMutableData dataWithLength:(NSUInteger)size];
  if (SecRandomCopyBytes(kSecRandomDefault, data.length, data.mutableBytes) != errSecSuccess)
    @throw [NSException exceptionWithName:NSInternalInconsistencyException reason:@"Secure random source unavailable" userInfo:nil];
  NSMutableString *hex = [NSMutableString stringWithCapacity:data.length * 2];
  const unsigned char *bytes = (const unsigned char *)data.bytes;
  for (NSUInteger i = 0; i < data.length; i++) [hex appendFormat:@"%02x", bytes[i]];
  return hex;
}
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(randomUUID) { return NSUUID.UUID.UUIDString.lowercaseString; }

// Exact service/account encoding used by the previously shipped app. This keeps
// installed credentials readable with the same signing team and bundle identifier.
- (NSMutableDictionary *)query:(NSString *)key service:(NSString *)service {
  NSData *encoded = [key dataUsingEncoding:NSUTF8StringEncoding];
  return [@{(__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
            (__bridge id)kSecAttrService: service,
            (__bridge id)kSecAttrAccount: encoded,
            (__bridge id)kSecAttrGeneric: encoded} mutableCopy];
}
- (void)rejectKeychain:(OSStatus)status reject:(RCTPromiseRejectBlock)reject {
  NSError *error = [NSError errorWithDomain:NSOSStatusErrorDomain code:status userInfo:nil];
  reject(@"KEYCHAIN_FAILURE", @"Could not access saved credentials", error);
}
RCT_EXPORT_METHOD(getSecureItem:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  for (NSString *service in @[@"app:no-auth", @"app"]) {
    NSMutableDictionary *query = [self query:key service:service];
    query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
    query[(__bridge id)kSecReturnData] = @YES;
    CFTypeRef item = NULL;
    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &item);
    if (status == errSecSuccess) {
      NSData *data = CFBridgingRelease(item);
      NSString *value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
      if (!value) { reject(@"KEYCHAIN_FAILURE", @"Saved credential is not valid UTF-8", nil); return; }
      resolve(value); return;
    }
    if (status != errSecItemNotFound) { [self rejectKeychain:status reject:reject]; return; }
  }
  resolve(nil);
}
RCT_EXPORT_METHOD(setSecureItem:(NSString *)key value:(NSString *)value resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSMutableDictionary *query = [self query:key service:@"app:no-auth"];
  NSDictionary *attributes = @{(__bridge id)kSecValueData: [value dataUsingEncoding:NSUTF8StringEncoding],
                              (__bridge id)kSecAttrAccessible: (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly};
  OSStatus status = SecItemUpdate((__bridge CFDictionaryRef)query, (__bridge CFDictionaryRef)attributes);
  if (status == errSecItemNotFound) {
    [query addEntriesFromDictionary:attributes];
    status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);
  }
  if (status != errSecSuccess) { [self rejectKeychain:status reject:reject]; return; }
  resolve(nil);
}
RCT_EXPORT_METHOD(deleteSecureItem:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  for (NSString *service in @[@"app:no-auth", @"app"]) {
    OSStatus status = SecItemDelete((__bridge CFDictionaryRef)[self query:key service:service]);
    if (status != errSecSuccess && status != errSecItemNotFound) { [self rejectKeychain:status reject:reject]; return; }
  }
  resolve(nil);
}
RCT_EXPORT_METHOD(getDeviceInfo:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  UIDevice *device = UIDevice.currentDevice;
  NSDictionary *info = NSBundle.mainBundle.infoDictionary;
  struct utsname systemInfo;
  uname(&systemInfo);
  NSString *modelId = [NSString stringWithUTF8String:systemInfo.machine];
#if TARGET_OS_SIMULATOR
  BOOL physical = NO;
#else
  BOOL physical = YES;
#endif
  resolve(@{@"platform": @"ios", @"platformScopedId": device.identifierForVendor.UUIDString ?: (id)NSNull.null,
            @"brand": @"Apple", @"manufacturer": @"Apple", @"modelName": device.model, @"modelId": modelId,
            @"osName": device.systemName, @"osVersion": device.systemVersion, @"appId": NSBundle.mainBundle.bundleIdentifier ?: (id)NSNull.null,
            @"appVersion": info[@"CFBundleShortVersionString"] ?: (id)NSNull.null, @"appBuild": info[@"CFBundleVersion"] ?: (id)NSNull.null,
            @"isPhysicalDevice": @(physical)});
}
RCT_EXPORT_METHOD(setClipboard:(NSString *)value resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  UIPasteboard.generalPasteboard.string = value; resolve(nil);
}
RCT_EXPORT_METHOD(selectPhoneNumber:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { resolve(nil); }
RCT_EXPORT_METHOD(setGameUi:(BOOL)immersive media:(BOOL)media resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { resolve(nil); }

- (void)finish:(NSString *)identifier error:(NSError *)error {
  CircleClip *clip = self.clips[identifier];
  if (!clip) return;
  [self.clips removeObjectForKey:identifier];
  [clip.task cancel]; clip.player.delegate = nil; [clip.player stop];
  if (error) clip.reject(@"AUDIO_FAILED", error.localizedDescription, error); else clip.resolve(nil);
}
- (NSError *)audioError:(NSString *)message { return [NSError errorWithDomain:@"CircleAudio" code:1 userInfo:@{NSLocalizedDescriptionKey: message}]; }
- (void)stopAll {
  for (NSString *identifier in self.clips.allKeys) [self finish:identifier error:[self audioError:@"Playback cancelled"]];
}
- (void)suspendAudio {
  [self stopAll];
  [self.mediaKeepAlive stop];
  [AVAudioSession.sharedInstance setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:NULL];
}
- (void)interrupted:(NSNotification *)notification {
  if ([notification.userInfo[AVAudioSessionInterruptionTypeKey] unsignedIntegerValue] == AVAudioSessionInterruptionTypeBegan) {
    [self stopAll]; [self.mediaKeepAlive stop];
    if (self.chatRequested && self.audioListeners) [self sendEventWithName:@"CircleAudioInterrupted" body:nil];
    self.chatRequested = NO;
  }
  else if (self.audioRequested && UIApplication.sharedApplication.applicationState == UIApplicationStateActive) {
    NSError *error = nil;
    [AVAudioSession.sharedInstance setActive:YES error:&error];
    if (!error) [self.mediaKeepAlive play];
  }
}
- (void)keepMediaVolumeActive {
  if (!self.mediaKeepAlive) {
    // A foreground-only silent PCM loop keeps hardware volume on the media route
    // between announcements. It is stopped on backgrounding and when play ends.
    const unsigned char header[44] = { 'R','I','F','F', 0x5e,0x11,0,0, 'W','A','V','E','f','m','t',' ',16,0,0,0,1,0,1,0,0x22,0x56,0,0,0x44,0xac,0,0,2,0,16,0,'d','a','t','a',0x3a,0x11,0,0 };
    NSMutableData *data = [NSMutableData dataWithBytes:header length:44];
    [data increaseLengthBy:4410];
    self.mediaKeepAlive = [[AVAudioPlayer alloc] initWithData:data error:NULL];
    self.mediaKeepAlive.numberOfLoops = -1;
  }
  if (!self.mediaKeepAlive.isPlaying) [self.mediaKeepAlive play];
}
- (NSError *)configureAudio {
  NSError *error = nil;
  AVAudioSession *session = AVAudioSession.sharedInstance;
  if (self.audioRequested || self.chatRequested) {
    if (self.chatRequested) [session setCategory:AVAudioSessionCategoryPlayAndRecord mode:AVAudioSessionModeVoiceChat options:(AVAudioSessionCategoryOptionDefaultToSpeaker | AVAudioSessionCategoryOptionAllowBluetooth) error:&error];
    else [session setCategory:AVAudioSessionCategoryPlayback mode:AVAudioSessionModeDefault options:AVAudioSessionCategoryOptionMixWithOthers error:&error];
    if (!error) [session setActive:YES error:&error];
    if (!error && self.audioRequested && !self.chatRequested) [self keepMediaVolumeActive];
    else [self.mediaKeepAlive stop];
  } else {
    [self stopAll];
    [self.mediaKeepAlive stop];
    [session setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:&error];
  }
  return error;
}
RCT_EXPORT_METHOD(setAudioActive:(BOOL)active resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  self.audioRequested = active;
  if (!active) [self stopAll];
  NSError *error = [self configureAudio];
  if (error) reject(@"AUDIO_SESSION", error.localizedDescription, error); else resolve(nil);
}
RCT_EXPORT_METHOD(setVoiceChatActive:(BOOL)active resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  self.chatRequested = active;
  NSError *error = [self configureAudio];
  if (error) reject(@"AUDIO_SESSION", error.localizedDescription, error); else resolve(nil);
}
RCT_EXPORT_METHOD(setVoiceVolume:(double)volume resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (!isfinite(volume)) { reject(@"INVALID_VOLUME", @"Volume must be finite", nil); return; }
  self.voiceVolume = (float)fmax(0.0, fmin(1.0, volume));
  for (CircleClip *clip in self.clips.allValues) clip.player.volume = self.voiceVolume;
  resolve(nil);
}
- (void)startPlayer:(AVAudioPlayer *)player identifier:(NSString *)identifier error:(NSError *)error {
  CircleClip *clip = self.clips[identifier];
  if (!clip) return;
  if (error || !player) { [self finish:identifier error:error ?: [self audioError:@"Voice clip is missing"]]; return; }
  clip.player = player; player.delegate = self; player.volume = self.voiceVolume;
  [player prepareToPlay];
  if (![player play]) [self finish:identifier error:[self audioError:@"Voice playback failed"]];
}
RCT_EXPORT_METHOD(playClip:(NSString *)identifier uri:(NSString *)uri resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  CircleClip *clip = [CircleClip new]; clip.resolve = resolve; clip.reject = reject; self.clips[identifier] = clip;
  NSURL *url = [NSURL URLWithString:uri];
  if (!url.scheme) url = [NSURL fileURLWithPath:[NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:uri]];
  if (url.isFileURL) {
    NSError *error = nil;
    AVAudioPlayer *player = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:&error];
    [self startPlayer:player identifier:identifier error:error];
  } else if ([url.scheme isEqualToString:@"http"] || [url.scheme isEqualToString:@"https"]) {
    // Metro serves assets over HTTP in debug builds. Release assets use file URLs.
    __weak CircleDevice *weakSelf = self;
    clip.task = [NSURLSession.sharedSession dataTaskWithURL:url completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
      dispatch_async(dispatch_get_main_queue(), ^{
        CircleDevice *owner = weakSelf;
        if (!owner.clips[identifier]) return;
        NSError *decodeError = error;
        AVAudioPlayer *player = data && !error ? [[AVAudioPlayer alloc] initWithData:data error:&decodeError] : nil;
        [owner startPlayer:player identifier:identifier error:decodeError];
      });
    }];
    [clip.task resume];
  } else [self finish:identifier error:[self audioError:@"Unsupported voice asset URL"]];
}
RCT_EXPORT_METHOD(stopClip:(NSString *)identifier) { [self finish:identifier error:[self audioError:@"Playback cancelled"]]; }
RCT_EXPORT_METHOD(getVoicePackFiles:(NSString *)voice revision:(NSString *)revision files:(NSArray *)files resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { [self.voiceStorage inspect:voice revision:revision files:files resolve:resolve reject:reject]; }
RCT_EXPORT_METHOD(downloadVoiceFile:(NSDictionary *)request resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { [self.voiceStorage download:request resolve:resolve reject:reject]; }
RCT_EXPORT_METHOD(cancelVoiceDownload:(NSString *)token resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { [self.voiceStorage cancel:token]; resolve(nil); }
RCT_EXPORT_METHOD(finishVoiceDownload:(NSString *)token resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { [self.voiceStorage finish:token]; resolve(nil); }
RCT_EXPORT_METHOD(removeVoicePack:(NSString *)voice resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { [self.voiceStorage remove:voice resolve:resolve reject:reject]; }
RCT_EXPORT_METHOD(getVoiceStorageFreeBytes:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) { [self.voiceStorage freeBytes:resolve reject:reject]; }
- (void)audioPlayerDidFinishPlaying:(AVAudioPlayer *)player successfully:(BOOL)success {
  for (NSString *identifier in self.clips.allKeys) if (self.clips[identifier].player == player) {
    [self finish:identifier error:success ? nil : [self audioError:@"Voice playback failed"]]; return;
  }
}
- (void)audioPlayerDecodeErrorDidOccur:(AVAudioPlayer *)player error:(NSError *)error {
  for (NSString *identifier in self.clips.allKeys) if (self.clips[identifier].player == player) { [self finish:identifier error:error ?: [self audioError:@"Could not decode voice"]]; return; }
}
@end
