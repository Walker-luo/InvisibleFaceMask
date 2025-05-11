Page({
    data: {
      imagePath: "" , // 存储选中图片的临时路径
      processedImagePath: null, // 处理后的图片路径
      tempFilePath: ''         // 临时文件路径
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
    },

      
        // 模拟处理图片的函数
        processImage: function () {
          if (!this.data.imagePath) {
            wx.showToast({
              title: '请先上传图片',
              icon: 'none'
            });
            return;
          }
      
          // 这里假设处理后的图片路径与原始图片路径相同
          // 如果有具体处理逻辑，可以在这里添加
          this.setData({
            processedImagePath: this.data.imagePath // 简单地赋值，真实项目可进行更复杂的处理
          });
      
          wx.showToast({
            title: '图片处理完成',
            icon: 'success'
          });
        },
      
        // 下载图片到设备
        downloadImage: function () {
          if (!this.data.processedImagePath) {
            wx.showToast({
              title: '请先处理图片',
              icon: 'none'
            });
            return;
          }
      
          wx.downloadFile({
            url: this.data.processedImagePath, // 图片地址
            success: function (res) {
              if (res.statusCode === 200) {
                wx.saveImageToPhotosAlbum({
                  filePath: res.tempFilePath, // 下载后的图片路径
                  success: function () {
                    wx.showToast({
                      title: '图片已保存',
                      icon: 'success'
                    });
                  },
                  fail: function (err) {
                    console.error("保存失败", err);
                    wx.showToast({
                      title: '保存失败',
                      icon: 'none'
                    });
                  }
                });
              }
            },
            fail: function (err) {
              console.error("下载失败", err);
              wx.showToast({
                title: '下载失败',
                icon: 'none'
              });
            }
          });
        }
      });
      