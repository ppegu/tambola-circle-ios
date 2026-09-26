#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <PhotosUI/PhotosUI.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@interface CirclePhotos : NSObject <RCTBridgeModule, PHPickerViewControllerDelegate>
@property(nonatomic, copy) RCTPromiseResolveBlock resolvePhoto;
@property(nonatomic, copy) RCTPromiseRejectBlock rejectPhoto;
@end

@implementation CirclePhotos
RCT_EXPORT_MODULE(CirclePhotos)
+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
RCT_EXPORT_METHOD(pick:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (self.resolvePhoto) { reject(@"PICKER_OPEN", @"Photo picker is already open.", nil); return; }
  UIViewController *presenter = RCTPresentedViewController();
  if (!presenter) { reject(@"NO_ACTIVITY", @"Open the app to choose a photo.", nil); return; }
  // PHPicker grants access only to the selected asset, including limited-library
  // users. No PHPhotoLibrary authorization or broad library entitlement is used.
  PHPickerConfiguration *config = [PHPickerConfiguration new];
  config.filter = PHPickerFilter.imagesFilter;
  config.selectionLimit = 1;
  PHPickerViewController *picker = [[PHPickerViewController alloc] initWithConfiguration:config];
  picker.delegate = self;
  self.resolvePhoto = resolve; self.rejectPhoto = reject;
  [presenter presentViewController:picker animated:YES completion:nil];
}
- (void)finish:(NSString *)base64 error:(NSError *)error {
  dispatch_async(dispatch_get_main_queue(), ^{
    RCTPromiseResolveBlock resolve = self.resolvePhoto; RCTPromiseRejectBlock reject = self.rejectPhoto;
    self.resolvePhoto = nil; self.rejectPhoto = nil;
    if (error && reject) reject(@"PHOTO_READ", @"Could not open this photo. Choose another photo.", error);
    else if (resolve) resolve(base64);
  });
}
- (void)picker:(PHPickerViewController *)picker didFinishPicking:(NSArray<PHPickerResult *> *)results {
  [picker dismissViewControllerAnimated:YES completion:nil];
  if (!results.count) { [self finish:nil error:nil]; return; }
  [results.firstObject.itemProvider loadFileRepresentationForTypeIdentifier:UTTypeImage.identifier completionHandler:^(NSURL *url, NSError *error) {
    if (!url || error) { [self finish:nil error:error ?: [NSError errorWithDomain:@"CirclePhotos" code:1 userInfo:nil]]; return; }
    @autoreleasepool {
      CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, NULL);
      CGImageRef thumb = source ? CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)@{
        (__bridge id)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
        (__bridge id)kCGImageSourceCreateThumbnailWithTransform: @YES,
        (__bridge id)kCGImageSourceThumbnailMaxPixelSize: @1024
      }) : NULL;
      if (source) CFRelease(source);
      if (!thumb) { [self finish:nil error:[NSError errorWithDomain:@"CirclePhotos" code:2 userInfo:nil]]; return; }
      UIImage *image = [UIImage imageWithCGImage:thumb]; CGImageRelease(thumb);
      CGFloat side = MIN(image.size.width, image.size.height), scale = 512.0 / side;
      UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat defaultFormat]; format.scale = 1; format.opaque = YES;
      UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:CGSizeMake(512, 512) format:format];
      UIImage *square = [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
        [[UIColor whiteColor] setFill]; UIRectFill(CGRectMake(0, 0, 512, 512));
        [image drawInRect:CGRectMake((512-image.size.width*scale)/2, (512-image.size.height*scale)/2, image.size.width*scale, image.size.height*scale)];
      }];
      NSData *jpeg = UIImageJPEGRepresentation(square, .85);
      if (jpeg.length > 256*1024) jpeg = UIImageJPEGRepresentation(square, .55);
      if (!jpeg || jpeg.length > 256*1024) { [self finish:nil error:[NSError errorWithDomain:@"CirclePhotos" code:3 userInfo:nil]]; return; }
      [self finish:[jpeg base64EncodedStringWithOptions:0] error:nil];
    }
  }];
}
- (void)invalidate { [self finish:nil error:nil]; }
@end
