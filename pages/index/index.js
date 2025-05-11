Page({
    data: {
      imagePath: "" // 存储选中图片的临时路径
    },
    
    // 点击上传区域时调用的函数
    chooseImage: function () {
      wx.chooseMedia({
        count: 1, // 只允许选择一张图片
        mediaType: ['image'], // 仅允许选择图片
        sourceType: ['album', 'camera'], // 可以从相册选择或使用相机拍照
        success: (res) => {
          // res.tempFiles 是一个数组，每个元素包含 tempFilePath、size、type 等信息
          if (res && res.tempFiles && res.tempFiles.length > 0) {
            this.setData({
              imagePath: res.tempFiles[0].tempFilePath
            });
          }
        },
        fail: (err) => {
          console.error("选择图片失败：", err);
        }
      });
    }
  });
  