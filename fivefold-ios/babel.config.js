module.exports = function (api) {
  api.cache(true);
  
  const plugins = [];

  // Strip console.log/warn/info statements in production builds.
  // console.error is preserved so genuine errors remain visible in crash reports.
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      { exclude: ['error'] },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
