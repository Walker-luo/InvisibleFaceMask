Page({
    data: {
    // 准备一个变量，用来存储状态栏高度
    statusBarHeight: 0,
      imageList: [],    // 存储所有选中图片的路径
      displayList: [],  // 存储需要在界面上展示的图片路径 (最多3张)
      processedImageList: [], // 存储处理/上传后的图片URL列表
      processedDisplayList: []
    },
  
    onLoad(options) {
        // 在页面加载时，获取系统信息
        try {
          const info = wx.getWindowInfo();
          // 将获取到的状态栏高度（单位px）设置到data中
          this.setData({
            statusBarHeight: info.statusBarHeight
          });
        } catch (e) {
          // 获取失败则使用一个默认值
          this.setData({
            statusBarHeight: 20 // 兜底值
          });
        }
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
            const displayPaths = allSelectedPaths.slice(0, 2);
  
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
  
    // 你可以在这里添加一个上传函数，暂时没用
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
    processImages: function () {
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
        processedImageList: this.data.imageList,
      });
      this.setData({
        processedDisplayList: this.data.processedImageList.slice(0,3)
      });
      wx.showToast({
        title: '图片处理完成',
        icon: 'success'
      });
    },
  

    // 下载图片到设备
  // 下载多张图片到设备
downloadImages: function () {
    // 检查是否有处理后的图片地址数组
    if (!this.data.processedImageList || !this.data.processedImageList.length) {
      wx.showToast({
        title: '请先处理图片',
        icon: 'none'
      });
      return;
    }
  
    const urls = this.data.processedImageList; // 图片地址数组
    let successCount = 0;
    let failCount = 0;
  
    // 遍历所有图片地址进行下载和保存
    urls.forEach((imageUrl) => {
      wx.downloadFile({
        url: imageUrl, // 单个图片地址
        success: (res) => {
          if (res.statusCode === 200) {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath, // 下载后的临时路径
              success: () => {
                successCount++;
                // 当所有图片处理完后显示提示
                if (successCount + failCount === urls.length) {
                  wx.showToast({
                    title: failCount ? '部分图片保存失败' : '所有图片已保存',
                    icon: failCount ? 'none' : 'success'
                  });
                }
              },
              fail: (err) => {
                console.error("保存失败：", err);
                failCount++;
                if (successCount + failCount === urls.length) {
                  wx.showToast({
                    title: '部分图片保存失败，请检查权限',
                    icon: 'none'
                  });
                }
              }
            });
          } else {
            console.error("下载失败，响应码：", res.statusCode);
            failCount++;
            if (successCount + failCount === urls.length) {
              wx.showToast({
                title: '部分图片下载失败',
                icon: 'none'
              });
            }
          }
        },
        fail: (err) => {
          console.error("下载失败：", err);
          failCount++;
          if (successCount + failCount === urls.length) {
            wx.showToast({
              title: '部分图片下载失败',
              icon: 'none'
            });
          }
        }
      });
    });
  }
  
  });
  