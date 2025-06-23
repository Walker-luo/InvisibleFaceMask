Page({
    data: {
      imageList: [],    // 存储所有选中图片的路径
      displayList: [],  // 存储需要在界面上展示的图片路径 (最多3张)
      processedImageList: [], // 存储处理/上传后的图片URL列表
    },
  
    chooseImage: function () {
      wx.chooseMedia({
        // 1. 修改count，允许最多选择20张
        count: 20, 
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          if (res && res.tempFiles && res.tempFiles.length > 0) {
            // 2. 获取所有选中图片的临时路径
            const allSelectedPaths = res.tempFiles.map(file => file.tempFilePath);
            
            // 3. 截取前3张用于显示
            const displayPaths = allSelectedPaths.slice(0, 3);
  
            // 4. 更新data中的数据
            this.setData({
              imageList: allSelectedPaths,
              displayList: displayPaths,
            });
  
            console.log("总共选择了 " + allSelectedPaths.length + " 张图片");
            console.log("待上传的图片列表:", this.data.imageList);
          }
        },
        fail: (err) => {
          // 用户取消选择时也会进入fail，可以不用提示错误
          if (err.errMsg !== "chooseMedia:fail cancel") {
              console.error("选择图片失败：", err);
          }
        }
      });
    },
  
    // 你可以在这里添加一个上传函数
    uploadFiles: function() {
      if (this.data.imageList.length === 0) {
        wx.showToast({
          title: '请先选择图片',
          icon: 'none'
        });
        return;
      }
  
      wx.showLoading({
        title: '正在上传处理...',
        mask: true
      });
      
      // 在这里编写你的上传逻辑，遍历 this.data.imageList 数组
      // 使用 wx.uploadFile
      console.log("准备上传以下文件:", this.data.imageList);
      // ...
    },
  
    // 模拟处理图片的函数
    processImage: function () {
      if (this.data.imageList.length === 0) {
        wx.showToast({
          title: '请先上传图片',
          icon: 'none'
        });
        return;
      }
      // 这里示例直接将原图作为处理结果显示，
      // 你可以在这里加入实际的图片处理逻辑
      this.setData({
        processedImageList: this.data.displayList
      });
      wx.showToast({
        title: '图片处理完成',
        icon: 'success'
      });
    },
  
    // 下载图片到设备
    downloadImage: function () {
      if (!this.data.processedImageList) {
        wx.showToast({
          title: '请先处理图片',
          icon: 'none'
        });
        return;
      }
      wx.downloadFile({
        url: this.data.processedImageList, // 处理后的图片地址
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
  