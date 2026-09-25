module.exports = {
  dependency: {
    platforms: {
      android: { sourceDir: './android', packageImportPath: 'import com.ppegu.circledevice.CircleDevicePackage;', packageInstance: 'new CircleDevicePackage()' },
      ios: {},
    },
  },
};
