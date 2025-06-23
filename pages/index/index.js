Page({
    data: {
      imagePath: "",           // 存储用户选中图片的临时路径
      processedImagePath: null, // 处理后的图片路径（预览和下载时使用）
      previewWidth: 0,         // 图片预览宽度（单位：px）
      previewHeight: 0         // 图片预览高度（单位：px）
    },
  
    // 点击上传区域时调用的函数，调用 wx.chooseMedia 选择图片
    chooseImage: function () {
      wx.chooseMedia({
        count: 3, // 只允许选择一张图片
        mediaType: ['image'], // 仅允许选择图片
        sourceType: ['album', 'camera'], // 可从相册或相机选择
        success: (res) => {
            if (res && res.tempFiles && res.tempFiles.length > 0) {
              const tempFilePath = res.tempFiles[0].tempFilePath;
              // 获取图片信息，这是计算尺寸的关键
              wx.getImageInfo({
                src: tempFilePath,
                success: (imgRes) => {
                  // 1. 获取屏幕信息，以确定容器的最大宽度
                  const windowInfo = wx.getWindowInfo();
                  const screenWidth = windowInfo.windowWidth;
                  // 2. 设定容器的最大宽度为屏幕的90% (与WXSS中的初始值对应)
                  const containerMaxWidth = screenWidth * 0.9;
    
                  // 3. 计算缩放后的尺寸
                  // 我们要让图片的宽度等于容器的最大宽度，然后等比缩放高度
                  const scale = containerMaxWidth / imgRes.width;
                  const finalWidth = containerMaxWidth;
                  const finalHeight = imgRes.height * scale;
    
                  // 4. 更新数据，将图片路径和计算出的容器尺寸存入data
                  this.setData({
                    imagePath: tempFilePath,
                    containerWidth: finalWidth,
                    containerHeight: finalHeight
                  });
                },
              fail: (err) => {
                console.error("获取图片信息失败：", err);
                // 如果获取失败，则设置默认预览尺寸
                this.setData({
                  imagePath: tempFilePath,
                  previewWidth: 300,
                  previewHeight: 300
                });
              }
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
      // 这里示例直接将原图作为处理结果显示，
      // 你可以在这里加入实际的图片处理逻辑
      this.setData({
        processedImagePath: this.data.imagePath
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
        url: this.data.processedImagePath, // 处理后的图片地址
        success: (res) => {
          if (res.statusCode === 200) {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath, // 下载后的图片临时路径
              success: () => {
                wx.showToast({
                  title: '图片已保存',
                  icon: 'success'
                });
              },
              fail: (err) => {
                console.error("保存失败：", err);
                wx.showToast({
                  title: '保存失败，请检查权限',
                  icon: 'none'
                });
              }
            });
          }
        },
        fail: (err) => {
          console.error("下载失败：", err);
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      });
    }
  });
  