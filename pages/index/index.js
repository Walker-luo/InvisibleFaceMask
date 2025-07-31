Page({
    data: {
    // 准备一个变量，用来存储状态栏高度
    statusBarHeight: 0,
      imageList: [],    // 存储所有选中图片的路径
      displayList: [],  // 存储需要在界面上展示的图片路径 (最多3张)
      processedImageList: [], // 存储处理/上传后的图片URL列表
      processedDisplayList: [],
      isProcessing: false,         
      uploadUrl: 'http://202.120.36.7:40555/upload',  // 图片上传接口
      processUrl: 'http://202.120.36.7:40555/process', // 图片处理接口
      downloadBaseUrl: 'http://202.120.36.7:40555/download/' // 下载基础路径
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
            
            // 3. 截取前2张用于显示
            const displayPaths = allSelectedPaths.slice(0, 2);
  
            // 4. 更新data中的数据
            this.setData({
              imageList: allSelectedPaths,
              displayList: displayPaths,
              processedImageList: [], 
              processedDisplayList: [],
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
  

    processImages: function() {
        if (this.data.imageList.length === 0) {
            wx.showToast({ title: '请先上传图片', icon: 'none' });
            return;
        }
        if (this.data.isProcessing) return;
        
        const that = this;
        that.setData({ isProcessing: true });
        wx.showLoading({ title: '处理中...', mask: true });
    
        // 上传并处理图像：得到fid 和 对应filename
        const uploadTasks = this.data.imageList.map(filePath => {
            return new Promise((resolve, reject) => {
                // 1. 读取文件为Base64编码
                wx.getFileSystemManager().readFile({
                    filePath: filePath,
                    encoding: 'base64',

                    success: (readRes) => {
                        // 2. 发送包含处理指令的请求
                        wx.request({
                            url: that.data.uploadUrl, // 
                            method: 'POST',
                            header: { 'Content-Type': 'application/json' },
                            data: {
                                image: readRes.data,
                                filename: filePath.split('/').pop(),
                            },

                            success: (res) => {
                                if (res.statusCode === 200) { 
                                    if (res.data && res.data.success) { 
                                        resolve({
                                            fileId: res.data.file_id,
                                            originalName: res.data.original_filename
                                        });
                                    } else {
                                        reject(new Error(res.data?.message || `上传失败(CODE ${res.statusCode})`))
                                    }
                                } else {
                                    reject(new Error(`HTTP错误: ${res.statusCode}`));
                                }
                            },
                            fail: (err) => {
                                const errInfo = err.errMsg.includes('timeout') ? 
                                    '网络超时' : '网络连接失败';
                                reject(new Error(errInfo));
                            }
                        });
                    },
                    fail: (err) => {
                        reject(new Error('图片转码失败: ' + err.errMsg));
                    }
                });
            });
        });

    // 图片展示部分
    Promise.all(uploadTasks)
        .then(metadataResults => {
        // 存储所有fileId用于后续操作
        const allFileIds = metadataResults.map(item => item.fileId);
        
        // 获取处理后的图片（仅获取前三张）
        const previewLimit = Math.min(3, allFileIds.length); // 最多获取3张
        const previewTasks = [];

        for (let i = 0; i < previewLimit; i++) {
            previewTasks.push(new Promise(resolve => {
            wx.request({
                url: `${that.data.processUrl}/${allFileIds[i]}`,
                responseType: 'arraybuffer',
                success: (imgRes) => {
                if (imgRes.statusCode === 200) {
                    const base64 = wx.arrayBufferToBase64(imgRes.data);
                    resolve(`data:image/jpeg;base64,${base64}`);
                } else {
                    resolve(null); // 标记获取失败
                }
                },
                fail: () => resolve(null)
            });
            }));
        }

        // 更新展示图片（非阻塞主流程）
        Promise.all(previewTasks).then(previewUrls => {
            that.setData({
            processedDisplayList: previewUrls.filter(url => url !== null)
            });
        });

        // 设置完整图片列表（包含占位符）
        const fullImageList = allFileIds.map((id, index) => 
            index < previewLimit ? previewUrls[index] : 'pending'
        );
        
        that.setData({
            processedImageList: fullImageList,  // 包含所有图片标识
            totalProcessedCount: allFileIds.length // 存储总数量
        });
        
        return allFileIds;
        })
        .then(allFileIds => {
        // 此处可添加后续操作（如保存元数据到数据库）
        console.log('全部处理完成，FileIDs:', allFileIds);
        wx.showToast({ title: `成功处理${allFileIds.length}张图片` });
        })
        .catch(err => {
        console.error('处理流程错误', err);
        wx.showToast({ 
            title: `失败: ${err.message.substring(0, 30)}`,
            icon: 'none',
            duration: 5000
        });
        })
        .finally(() => {
        that.setData({ isProcessing: false });
        wx.hideLoading();
        });
    },

    // 下载图片到设备
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
  