var gulp = require('gulp')
var plumber = require('gulp-plumber')
var rename = require('gulp-rename')
var image = require('gulp-image')
var imageResize = require('gulp-image-resize')
var webp = require('gulp-webp')
var runSequence = require('run-sequence')

var imageOptimConfig = {
  // 生成元: ./assets/images/bg/**/*
  // 生成先: ./build/images/bg/**/*
  paths: {
    folder: 'images/',
    src: './assets/',
    dest: './build/'
  },
  // folder: images/fooのfooの部分のフォルダ名
  // width: リサイズ後のサイズ
  // height: リサイズ後のサイズ
  // crop: クロッピングするかどうか
  resizeRule: [
    { folder: '300', width: 300, crop: false },
    { folder: '400x200', width: 400, height: 200, crop: true }
  ]
}

// {300,400x200}のような形で使いたいので、作る
var imageFolderNames = imageOptimConfig.resizeRule.map(function (v) { return v.folder }).join(',')

// convert to webp
gulp.task('imagemin:webp', function () {
  return gulp.src('./build/images/{' + imageFolderNames + '}/*.{png,jpg}')
    // webp化する
    .pipe(webp({quality: 70}))
    // webp化したものを配置する
    .pipe(gulp.dest('./build/images'))
})

// resize images
gulp.task('imagemin:resize', function (cb) {
  var endCount = 0
  imageOptimConfig.resizeRule.forEach(function (type) {
    var resize_settings = {
      width: type.width,
      crop: type.crop,
      upscale: false
    }
    // heightの指定があれば使用する
    if (type.height) {
      resize_settings.height = type.height
    }
    gulp.src(imageOptimConfig.paths.src + imageOptimConfig.paths.folder + type.folder + '/**/*.{png,jpg}')
      .pipe(plumber())
      // @2xにリネームするか
      .pipe(rename(function (path) { path.basename += '@2x' }))
      // 倍解像度を一旦コピー
      .pipe(gulp.dest(imageOptimConfig.paths.dest + imageOptimConfig.paths.folder + type.folder))
      // jpg, pngをリサイズする
      .pipe(imageResize(resize_settings))
      // @1xにリネームするか
      .pipe(rename(function (path) {
        path.basename = path.basename.replace('@2x', '@1x')
      }))
      .pipe(gulp.dest(imageOptimConfig.paths.dest + imageOptimConfig.paths.folder + type.folder))
      .on('end', function (e) {
        endCount++
        if (endCount >= imageOptimConfig.resizeRule.length) {
          cb && cb()
        }
      })
  })
})

// optimize images
gulp.task('imagemin:optimize', function () {
  return gulp.src('./build/images/{' + imageFolderNames + '}/*.{png,jpg}')
    .pipe(image({
      pngquant: true,
      zopflipng: true,
      advpng: true,
      jpegRecompress: false,
      jpegoptim: true
    }))
    // jpg, pngを最適化したものを配置
    .pipe(gulp.dest('./build/images'))
})

// imagemin
gulp.task('imagemin', function (cb) {
  // 1. assets以下の画像をリサイズしてbuild以下に設置
  // 2. build以下の画像を最適化処理
  // 3. build以下の画像をwebpに変換
  return runSequence('imagemin:resize', 'imagemin:optimize', 'imagemin:webp', cb)
})
