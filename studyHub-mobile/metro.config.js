const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

// 1. Tắt tính năng package exports để triệt tiêu các cảnh báo (warnings) import sub-path của Lucide icons
config.resolver.unstable_enablePackageExports = false

// 2. Thêm extraNodeModules và stub react-dom
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer/'),
  'react-dom': path.resolve(__dirname, 'stubs/react-dom.js'),
}

// 3. Định hướng lại các file .browser.js về .js gốc để sửa lỗi phân giải của Metro
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('decodePacket.browser.js')) {
    const originDir = path.dirname(context.originModulePath)
    const absolutePath = path.resolve(originDir, 'decodePacket.js')
    return {
      type: 'sourceFile',
      filePath: absolutePath,
    }
  }
  if (moduleName.includes('encodePacket.browser.js')) {
    const originDir = path.dirname(context.originModulePath)
    const absolutePath = path.resolve(originDir, 'encodePacket.js')
    return {
      type: 'sourceFile',
      filePath: absolutePath,
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

// 🟢 TỐI ƯU TỐC ĐỘ BUNDLE CHO METRO
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    format: {
      comments: false, // Loại bỏ comments/license thừa làm phình bundle
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Tránh load thừa các module khi chưa cần dùng ngay
    },
  }),
}

// Giới hạn max workers để tránh nghẽn I/O và ngốn CPU trên Windows
config.maxWorkers = 4

module.exports = withNativeWind(config, { input: './global.css' })