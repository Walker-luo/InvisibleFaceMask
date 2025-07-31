Page({
    data: {
    // 准备一个变量，用来存储状态栏高度
    statusBarHeight: 0,
      imageList: [],    // 存储所有选中图片的路径
      displayList: [],  // 存储需要在界面上展示的图片路径 (最多3张)
      processedImageList: [], // 存储处理/上传后的图片URL列表 (现在存储fileId和type)
      processedDisplayList: [], // 存储用于界面展示的图片列表
      isProcessing: false,         
      uploadUrl: 'http://202.120.36.7:40555/upload',  // 图片上传接口 (用于接收二进制流)
      fetchImageUrlBase: 'http://202.120.36.7:40555/image/', // 用于获取处理后的图片的基础URL，匹配后端 /image/<file_id>/
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
              processedImageList: [], // 重置处理后的列表
              processedDisplayList: [], // 重置处理后的显示列表
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


    processImages: function() {
        if (this.data.imageList.length === 0) {
            wx.showToast({ title: '请先选择图片', icon: 'none' });
            return;
        }
        if (this.data.isProcessing) return;
        
        const that = this;
        that.setData({ isProcessing: true });
        wx.showLoading({ title: '处理中...', mask: true });
    
        // 上传图片并获取fileId
        const uploadTasks = this.data.imageList.map(filePath => {
            return new Promise((resolve, reject) => {
                // 使用 wx.uploadFile 直接上传图片二进制流
                wx.uploadFile({
                    url: that.data.uploadUrl,
                    filePath: filePath, // 直接传入图片临时路径
                    name: 'image_file', // 后端接收文件的字段名，请根据您的后端API调整
                    formData: {
                        filename: filePath.split('/').pop(), // 原始文件名作为额外的表单数据
                    },
                    header: {
                        // wx.uploadFile 会自动设置 Content-Type 为 multipart/form-data
                        // 如果后端需要特定的Authorization等，可以在这里添加
                    },
                    success: (uploadRes) => {
                        if (uploadRes.statusCode === 200) {
                            try {
                                const data = JSON.parse(uploadRes.data); // wx.uploadFile的data是字符串，需要解析
                                if (data && data.success) {
                                    resolve({
                                        fileId: data.file_id,
                                        originalName: data.original_filename
                                    });
                                } else {
                                    reject(new Error(data?.message || `上传失败(CODE ${uploadRes.statusCode})`));
                                }
                            } catch (e) {
                                reject(new Error('解析上传结果失败: ' + e.message));
                            }
                        } else {
                            reject(new Error(`HTTP错误: ${uploadRes.statusCode}`));
                        }
                    },
                    fail: (err) => {
                        const errInfo = err.errMsg.includes('timeout') ? 
                            '网络超时' : '网络连接失败';
                        reject(new Error(errInfo));
                    }
                });
            });
        });

    // 图片展示部分
    Promise.all(uploadTasks)
        .then(metadataResults => {
            // 存储所有fileId用于后续操作
            const allFileIds = metadataResults.map(item => item.fileId);
            
            // 假设我们想要展示 'simswap_fake_protected' 类型的图片
            const imageTypeToDisplay = 'simswap_fake_protected'; 

            // 获取处理后的图片（仅获取前3张用于界面展示）
            const previewLimit = Math.min(3, allFileIds.length); 
            const previewTasks = [];
            
            for (let i = 0; i < previewLimit; i++) {
                previewTasks.push(new Promise(resolve => {
                    wx.request({
                        // 构建获取处理后图片的URL，例如: http://yourserver.com/image/file_id/simswap_fake_protected
                        url: `${that.data.fetchImageUrlBase}${allFileIds[i]}/`,
                        responseType: 'arraybuffer', // 接收二进制数据
                        success: (imgRes) => {
                            if (imgRes.statusCode === 200) {
                                // 将二进制数据转换为Base64用于在小程序界面显示
                                const base64 = wx.arrayBufferToBase64(imgRes.data);
                                resolve(`data:image/jpeg;base64,${base64}`);
                            } else {
                                console.error(`获取图片 ${allFileIds[i]} 失败, 状态码: ${imgRes.statusCode}`);
                                resolve(null); // 标记获取失败
                            }
                        },
                        fail: (err) => {
                            console.error(`获取图片 ${allFileIds[i]} 网络失败:`, err);
                            resolve(null);
                        }
                    });
                }));
            }

            // 更新展示图片（非阻塞主流程）
            Promise.all(previewTasks).then(previewUrls => {
                that.setData({
                    processedDisplayList: previewUrls.filter(url => url !== null)
                });
            });

            // 设置完整图片列表（存储fileId和imageType，用于后续下载）
            // processedImageList 现在存储的是 {fileId: '...', type: '...'} 对象
            const fullProcessedList = allFileIds.map(id => ({ 
                fileId: id, 
                type: imageTypeToDisplay // 记录此图片是哪个类型，以便下载时使用
            }));
            
            that.setData({
                processedImageList: fullProcessedList,  // 包含所有图片标识及其类型
                totalProcessedCount: allFileIds.length // 存储总数量
            });
            
            return allFileIds; // 继续传递allFileIds给下一个then
        })
        .then(allFileIds => {
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
        // 检查是否有处理后的图片地址数组 (现在是 {fileId, type} 对象数组)
        if (!this.data.processedImageList || !this.data.processedImageList.length) {
            wx.showToast({
                title: '请先处理图片',
                icon: 'none'
            });
            return;
        }
      
        const imagesToDownload = this.data.processedImageList; // {fileId, type} 对象数组
        let successCount = 0;
        let failCount = 0;
      
        // 遍历所有图片信息进行下载和保存
        imagesToDownload.forEach((imageInfo, index) => {
            // 根据 fileId 和 type 构造完整的下载 URL
            const downloadUrl = `${this.data.fetchImageUrlBase}${imageInfo.fileId}/${imageInfo.type}`;
            
            wx.downloadFile({
                url: downloadUrl, // 构造的完整图片URL
                success: (res) => {
                    if (res.statusCode === 200) {
                        wx.saveImageToPhotosAlbum({
                            filePath: res.tempFilePath, // 下载后的临时路径
                            success: () => {
                                successCount++;
                                // 当所有图片处理完后显示提示
                                if (successCount + failCount === imagesToDownload.length) {
                                    wx.showToast({
                                        title: failCount ? '部分图片保存失败' : '所有图片已保存',
                                        icon: failCount ? 'none' : 'success'
                                    });
                                }
                            },
                            fail: (err) => {
                                console.error(`保存第 ${index+1} 张图片失败：`, err);
                                failCount++;
                                if (successCount + failCount === imagesToDownload.length) {
                                    wx.showToast({
                                        title: '部分图片保存失败，请检查权限',
                                        icon: 'none'
                                    });
                                }
                            }
                        });
                    } else {
                        console.error(`下载第 ${index+1} 张图片失败，响应码：`, res.statusCode);
                        failCount++;
                        if (successCount + failCount === imagesToDownload.length) {
                            wx.showToast({
                                title: '部分图片下载失败',
                                icon: 'none'
                            });
                        }
                    }
                },
                fail: (err) => {
                    console.error(`下载第 ${index+1} 张图片网络失败：`, err);
                    failCount++;
                    if (successCount + failCount === imagesToDownload.length) {
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