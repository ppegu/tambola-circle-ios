Pod::Spec.new do |s|
  s.name = 'CircleDevice'
  s.version = '1.0.0'
  s.summary = 'Tambola Circle device capability adapter'
  s.description = 'Native audio, secure storage, randomness, device metadata, clipboard and game UI.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Tambola Circle'
  s.homepage = 'https://github.com/ppegu/trust-tambola'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/ppegu/trust-tambola.git' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'React-Core'
  s.frameworks = 'AVFoundation', 'Security', 'UIKit', 'PhotosUI', 'ImageIO', 'UniformTypeIdentifiers'
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
end
