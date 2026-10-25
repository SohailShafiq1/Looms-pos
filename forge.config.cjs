module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Loom POS',
    executableName: 'loom-pos',
    icon: './assets/loom-pos'
  },
  rebuildConfig: {},
  makers: [
    { name: '@electron-forge/maker-squirrel', config: { name: 'loom_pos' } },
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'win32'] }
  ]
};
