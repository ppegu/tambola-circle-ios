#import <UIKit/UIKit.h>
#import <CoreGraphics/CoreGraphics.h>
#import <ImageIO/ImageIO.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <objc/message.h>
#import <math.h>

// Share → Tambola Circle. The image is downsized here and left on a named
// pasteboard; the app takes it (CircleDevice.takeSharedImage), processes it
// again and sends it for review. Named pasteboards are shared by apps signed by
// the same team, so Sideloadly-signed builds need no App Group entitlement. iOS
// keeps one only while the process that created it runs, so this extension
// stays open until the app has taken the image, then closes itself.
static NSString *const ShareScreenshotPasteboard = @"com.ppegu.tambola.shared-proof";
static NSString *const ShareScreenshotURL = @"tambolacircle://transaction-request";
static const CGFloat ShareScreenshotMaxSide = 2000;        // SCREENSHOT_MAX_SIDE in shared/transactions.ts
static const NSUInteger ShareScreenshotMaxBytes = 1400000; // below MAX_SCREENSHOT_BYTES

// Extensions get little memory: ImageIO decodes only a downsized copy, with the
// EXIF orientation applied. The full-size image is never decoded.
static CGImageRef ShareScreenshotThumbnail(CGImageSourceRef source) {
  if (!source || CGImageSourceGetCount(source) < 1) return NULL;
  return CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)@{
    (__bridge id)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
    (__bridge id)kCGImageSourceCreateThumbnailWithTransform: @YES,
    (__bridge id)kCGImageSourceShouldCacheImmediately: @YES,
    (__bridge id)kCGImageSourceThumbnailMaxPixelSize: @(ShareScreenshotMaxSide)
  });
}

// Some apps share an in-memory image instead of a file or data.
static CGImageRef ShareScreenshotDraw(UIImage *image) {
  CGFloat width = image.size.width * image.scale, height = image.size.height * image.scale;
  if (width < 1 || height < 1) return NULL;
  CGFloat factor = MIN(1.0, ShareScreenshotMaxSide / MAX(width, height));
  CGSize size = CGSizeMake(MAX(1.0, round(width * factor)), MAX(1.0, round(height * factor)));
  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat preferredFormat];
  format.scale = 1;
  format.opaque = YES;
  format.preferredRange = UIGraphicsImageRendererFormatRangeStandard;
  UIImage *drawn = [[[UIGraphicsImageRenderer alloc] initWithSize:size format:format] imageWithActions:^(UIGraphicsImageRendererContext *context) {
    [UIColor.whiteColor setFill];
    [context fillRect:CGRectMake(0, 0, size.width, size.height)];
    [image drawInRect:CGRectMake(0, 0, size.width, size.height)];
  }];
  return drawn.CGImage ? CGImageRetain(drawn.CGImage) : NULL;
}

// JPEG has no transparency: draw on white, in sRGB.
static CGImageRef ShareScreenshotFlatten(CGImageRef image, size_t width, size_t height) {
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

static NSData *ShareScreenshotEncode(CGImageRef image, double quality) {
  NSMutableData *data = [NSMutableData data];
  CGImageDestinationRef destination = CGImageDestinationCreateWithData((__bridge CFMutableDataRef)data, (__bridge CFStringRef)UTTypeJPEG.identifier, 1, NULL);
  if (!destination) return nil;
  CGImageDestinationAddImage(destination, image, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageDestinationLossyCompressionQuality: @(quality)});
  BOOL written = CGImageDestinationFinalize(destination);
  CFRelease(destination);
  return written ? data : nil;
}

// Steps the quality down, then the size, until the JPEG fits.
static NSData *ShareScreenshotJPEG(CGImageRef image) {
  size_t width = image ? CGImageGetWidth(image) : 0, height = image ? CGImageGetHeight(image) : 0;
  if (!width || !height) return nil;
  for (double scale = 1;; scale *= 0.75) {
    size_t w = MAX((size_t)1, (size_t)llround(width * scale)), h = MAX((size_t)1, (size_t)llround(height * scale));
    CGImageRef flat = ShareScreenshotFlatten(image, w, h);
    if (!flat) return nil;
    NSData *jpeg = nil;
    for (NSNumber *quality in @[@0.88, @0.8, @0.72, @0.64, @0.56]) {
      jpeg = ShareScreenshotEncode(flat, quality.doubleValue);
      if (!jpeg || jpeg.length <= ShareScreenshotMaxBytes) break;
    }
    CGImageRelease(flat);
    if (!jpeg) return nil;
    if (jpeg.length <= ShareScreenshotMaxBytes) return jpeg;
    if (MAX(w, h) <= 600) return nil;
  }
}

static NSData *ShareScreenshotFromSource(CGImageSourceRef source) {
  CGImageRef image = ShareScreenshotThumbnail(source);
  NSData *jpeg = ShareScreenshotJPEG(image);
  CGImageRelease(image);
  return jpeg;
}

static NSData *ShareScreenshotFromFile(NSURL *url) {
  BOOL scoped = [url startAccessingSecurityScopedResource];
  CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageSourceShouldCache: @NO});
  NSData *jpeg = source ? ShareScreenshotFromSource(source) : nil;
  if (source) CFRelease(source);
  if (scoped) [url stopAccessingSecurityScopedResource];
  return jpeg;
}

static NSData *ShareScreenshotFromItem(id item) {
  if ([item isKindOfClass:NSURL.class]) return [(NSURL *)item isFileURL] ? ShareScreenshotFromFile(item) : nil;
  if ([item isKindOfClass:NSData.class]) {
    CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)item, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageSourceShouldCache: @NO});
    NSData *jpeg = source ? ShareScreenshotFromSource(source) : nil;
    if (source) CFRelease(source);
    return jpeg;
  }
  if (![item isKindOfClass:UIImage.class]) return nil;
  CGImageRef image = ShareScreenshotDraw(item);
  NSData *jpeg = ShareScreenshotJPEG(image);
  CGImageRelease(image);
  return jpeg;
}

// The concrete image type (HEIC, PNG, …) in the sharing app's order of fidelity.
static NSString *ShareTransactionScreenshotType(NSItemProvider *provider) {
  for (NSString *identifier in provider.registeredTypeIdentifiers)
    if ([[UTType typeWithIdentifier:identifier] conformsToType:UTTypeImage]) return identifier;
  return [provider hasItemConformingToTypeIdentifier:UTTypeImage.identifier] ? UTTypeImage.identifier : nil;
}

// The app empties and removes the pasteboard when it takes the image.
static BOOL ShareScreenshotWaiting(void) {
  return [UIPasteboard pasteboardWithName:ShareScreenshotPasteboard create:NO].numberOfItems > 0;
}

// A file representation keeps memory low; the item itself (data or a UIImage)
// is the fallback for apps that offer nothing else.
static void ShareScreenshotLoad(NSItemProvider *provider, NSString *type, void (^done)(NSData *jpeg)) {
  [provider loadFileRepresentationForTypeIdentifier:type completionHandler:^(NSURL *url, NSError *error) {
    NSData *jpeg = nil;
    @autoreleasepool {
      if (url) jpeg = ShareScreenshotFromFile(url);
    }
    if (jpeg) { done(jpeg); return; }
    [provider loadItemForTypeIdentifier:type options:nil completionHandler:^(id<NSSecureCoding> item, NSError *itemError) {
      NSData *fallback = nil;
      @autoreleasepool {
        fallback = ShareScreenshotFromItem(item);
      }
      done(fallback);
    }];
  }];
}

@interface ShareViewController : UIViewController
@end

@interface ShareViewController ()
@property(nonatomic, strong) UILabel *statusLabel;
@property(nonatomic, strong) UIActivityIndicatorView *spinner;
@property(nonatomic, strong) UIButton *actionButton;
@property(nonatomic) BOOL started;
@property(nonatomic) BOOL screenshotSaved;
- (void)closeShare;
- (void)hostWillEnterForeground:(NSNotification *)notification;
@end

@implementation ShareViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  self.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
  UIColor *plum = [UIColor colorWithRed:0x31 / 255.0 green:0x06 / 255.0 blue:0x5b / 255.0 alpha:1];
  UIColor *accent = [UIColor colorWithRed:0x76 / 255.0 green:0x20 / 255.0 blue:0x7d / 255.0 alpha:1];
  self.view.backgroundColor = plum;

  UIView *card = [UIView new];
  card.translatesAutoresizingMaskIntoConstraints = NO;
  card.backgroundColor = [UIColor colorWithRed:1 green:0xfc / 255.0 blue:0xf7 / 255.0 alpha:1];
  card.layer.cornerRadius = 22;

  UILabel *title = [UILabel new];
  title.text = @"Tambola Circle";
  title.font = [UIFont systemFontOfSize:22 weight:UIFontWeightBold];
  title.textColor = plum;

  UIActivityIndicatorView *spinner = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleLarge];
  spinner.color = accent;
  spinner.hidesWhenStopped = YES;
  [spinner startAnimating];

  UILabel *status = [UILabel new];
  status.text = @"Opening shared screenshot…";
  status.font = [UIFont preferredFontForTextStyle:UIFontTextStyleBody];
  status.adjustsFontForContentSizeCategory = YES;
  status.textColor = [UIColor colorWithRed:0x29 / 255.0 green:0x04 / 255.0 blue:0x35 / 255.0 alpha:1];
  status.textAlignment = NSTextAlignmentCenter;
  status.numberOfLines = 0;

  UIButtonConfiguration *style = [UIButtonConfiguration filledButtonConfiguration];
  style.baseBackgroundColor = accent;
  style.baseForegroundColor = UIColor.whiteColor;
  style.cornerStyle = UIButtonConfigurationCornerStyleCapsule;
  style.contentInsets = NSDirectionalEdgeInsetsMake(10, 32, 10, 32);
  UIButton *button = [UIButton buttonWithConfiguration:style primaryAction:nil];
  button.hidden = YES;
  [button addTarget:self action:@selector(closeShare) forControlEvents:UIControlEventTouchUpInside];

  UIStackView *stack = [[UIStackView alloc] initWithArrangedSubviews:@[title, spinner, status, button]];
  stack.translatesAutoresizingMaskIntoConstraints = NO;
  stack.axis = UILayoutConstraintAxisVertical;
  stack.alignment = UIStackViewAlignmentCenter;
  stack.spacing = 16;
  [card addSubview:stack];
  [self.view addSubview:card];

  UILayoutGuide *safe = self.view.safeAreaLayoutGuide;
  NSLayoutConstraint *preferredWidth = [card.widthAnchor constraintEqualToConstant:340];
  preferredWidth.priority = UILayoutPriorityDefaultHigh;
  [NSLayoutConstraint activateConstraints:@[
    [card.centerXAnchor constraintEqualToAnchor:safe.centerXAnchor],
    [card.centerYAnchor constraintEqualToAnchor:safe.centerYAnchor],
    [card.leadingAnchor constraintGreaterThanOrEqualToAnchor:safe.leadingAnchor constant:24],
    preferredWidth,
    [stack.topAnchor constraintEqualToAnchor:card.topAnchor constant:28],
    [stack.bottomAnchor constraintEqualToAnchor:card.bottomAnchor constant:-28],
    [stack.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:24],
    [stack.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-24],
    [status.widthAnchor constraintEqualToAnchor:stack.widthAnchor],
  ]];
  self.statusLabel = status;
  self.spinner = spinner;
  self.actionButton = button;
  [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(hostWillEnterForeground:) name:NSExtensionHostWillEnterForegroundNotification object:nil];
}

- (void)dealloc {
  [NSNotificationCenter.defaultCenter removeObserver:self];
}

- (void)viewDidAppear:(BOOL)animated {
  [super viewDidAppear:animated];
  if (self.started) return;
  self.started = YES;
  NSItemProvider *provider = nil;
  NSString *type = nil;
  for (NSExtensionItem *item in self.extensionContext.inputItems) {
    for (NSItemProvider *attachment in item.attachments) {
      type = ShareTransactionScreenshotType(attachment);
      if (type) { provider = attachment; break; }
    }
    if (provider) break;
  }
  if (!provider) { [self showFailure]; return; }
  __weak ShareViewController *weakSelf = self;
  ShareScreenshotLoad(provider, type, ^(NSData *jpeg) {
    dispatch_async(dispatch_get_main_queue(), ^{
      ShareViewController *controller = weakSelf;
      if (jpeg) [controller saveScreenshot:jpeg];
      else [controller showFailure];
    });
  });
}

- (void)saveScreenshot:(NSData *)jpeg {
  UIPasteboard *pasteboard = [UIPasteboard pasteboardWithName:ShareScreenshotPasteboard create:YES];
  if (!pasteboard) { [self showFailure]; return; }
  // Kept for a day at most when the app is never opened.
  [pasteboard setItems:@[@{UTTypeJPEG.identifier: jpeg}] options:@{
    UIPasteboardOptionLocalOnly: @YES,
    UIPasteboardOptionExpirationDate: [NSDate dateWithTimeIntervalSinceNow:24 * 60 * 60]
  }];
  self.screenshotSaved = YES;
  // Not completed yet: the pasteboard lives as long as this process does.
  __weak ShareViewController *weakSelf = self;
  [self openTambolaCircle:^(BOOL opened) {
    [weakSelf showStatus:opened ? @"Continue in Tambola Circle to submit the transaction request."
                                : @"Open Tambola Circle to submit the transaction request. This closes by itself when you come back."
                  button:@"Close"];
  }];
}

// Back in the sharing app: once Tambola Circle has the image, close.
- (void)hostWillEnterForeground:(NSNotification *)notification {
  if (self.screenshotSaved && !ShareScreenshotWaiting()) [self.extensionContext completeRequestReturningItems:@[] completionHandler:nil];
}

// UIApplication's openURL is unavailable to extension code at compile time, but
// the application object is on the responder chain and opens our own scheme.
- (void)openTambolaCircle:(void (^)(BOOL opened))completion {
  __block BOOL answered = NO;
  void (^answer)(BOOL) = ^(BOOL opened) {
    if (answered) return;
    answered = YES;
    completion(opened);
  };
  NSURL *url = [NSURL URLWithString:ShareScreenshotURL];
  SEL selector = NSSelectorFromString(@"openURL:options:completionHandler:");
  for (UIResponder *responder = self; responder; responder = responder.nextResponder) {
    if (![responder isKindOfClass:UIApplication.class] || ![responder respondsToSelector:selector]) continue;
    void (^opened)(BOOL) = ^(BOOL success) {
      dispatch_async(dispatch_get_main_queue(), ^{ answer(success); });
    };
    ((void (*)(id, SEL, NSURL *, NSDictionary *, void (^)(BOOL)))objc_msgSend)(responder, selector, url, @{}, opened);
    // Never leave the card spinning if iOS does not answer.
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{ answer(NO); });
    return;
  }
  answer(NO);
}

- (void)showFailure {
  [self showStatus:@"Couldn’t open this image. Share a screenshot or photo." button:@"Close"];
}

- (void)showStatus:(NSString *)text button:(NSString *)title {
  [self.spinner stopAnimating];
  self.statusLabel.text = text;
  UIButtonConfiguration *style = self.actionButton.configuration;
  style.title = title;
  self.actionButton.configuration = style;
  self.actionButton.hidden = NO;
}

- (void)closeShare {
  if (self.screenshotSaved && !ShareScreenshotWaiting()) {
    [self.extensionContext completeRequestReturningItems:@[] completionHandler:nil];
    return;
  }
  // Closing before the app took the image cancels the share; nothing is left behind.
  if (self.screenshotSaved) [UIPasteboard removePasteboardWithName:ShareScreenshotPasteboard];
  [self.extensionContext cancelRequestWithError:[NSError errorWithDomain:NSCocoaErrorDomain code:NSUserCancelledError userInfo:nil]];
}

@end
