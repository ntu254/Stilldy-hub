module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel'
    ],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      'react-native-worklets/plugin',
      [
        'transform-imports',
        {
          'lucide-react-native': {
            transform: (importName) => {
              let name = importName;
              if (name.endsWith('Icon')) {
                name = name.slice(0, -4);
              }
              
              // Đối chiếu các alias đặc biệt của Lucide sang tên file thực tế
              const aliases = {
                'Filter': 'funnel',
                'FilterX': 'funnel-x',
                'CheckCircle': 'circle-check-big',
                'AlertCircle': 'circle-alert',
                'UploadCloud': 'cloud-upload',
                'Home': 'house',
                'Trash2': 'trash-2',
              };

              const kebabName = aliases[name] || name
                .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .toLowerCase();
                
              return `lucide-react-native/dist/cjs/icons/${kebabName}`;
            },
            preventFullImport: true,
          },
        },
      ],
    ],
  };
};
