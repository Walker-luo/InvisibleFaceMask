// app.js
App({
    onLaunch: function () {
        wx.cloud.init({
          env: 'cloud1-6gjt5hm7af7044c7', // 例如：'prod-1gxxxxxx'
          traceUser: true,
        })
      }
})
