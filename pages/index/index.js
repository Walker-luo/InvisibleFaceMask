Page({
    data: {
    // 准备一个变量，用来存储状态栏高度
    statusBarHeight: 0,
      imageList: [],    // 存储所有选中图片的路径
      displayList: [],  // 存储需要在界面上展示的图片路径 (最多3张)
      processedImageList: [], // 存储处理/上传后的图片URL列表 (现在存储fileId和type)
      processedDisplayList: [], // 存储用于界面展示的图片列表
      isProcessing: false,         
      uploadUrl: 'http://202.120.36.7:40580/upload',  // 图片上传接口 (用于接收二进制流)
      fetchImageUrlBase: 'http://202.120.36.7:40580/image/', // 用于获取处理后的图片的基础URL，匹配后端 /image/<file_id>/
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
                        console.error('wx.uploadFile 失败，原始错误对象:', err); // 打印完整错误信息

                        let errInfo = '网络连接失败'; // 默认错误信息
                        if (err.errMsg) {
                            // 可以根据 errMsg 提供更具体的中文提示
                            if (err.errMsg.includes('timeout')) {
                                errInfo = '网络请求超时';
                            } else if (err.errMsg.includes('fail ssl hand shake error')) {
                                errInfo = 'SSL证书握手失败，请检查HTTPS配置';
                            } else if (err.errMsg.includes('fail no valid domains')) {
                                errInfo = '请求的域名未在小程序后台配置为合法域名';
                            }
                            // 将原始英文错误信息附加上，方便调试
                            errInfo += ` (${err.errMsg})`;
                        }
                        reject(new Error(errInfo));
                    }
                });
            });
        });
        // 图片展示部分
        Promise.all(uploadTasks)
        .then(metadataResults => {
            const allFileIds = metadataResults.map(item => item.fileId);

            // 获取处理后的图片（仅获取前3张用于界面展示）
            const previewLimit = Math.min(3, allFileIds.length); 
            const previewTasks = [];
            
            for (let i = 0; i < previewLimit; i++) {
                // 使用 wx.downloadFile 来获取图片并获得本地路径
                previewTasks.push(new Promise(resolve => {
                    const downloadUrl = `${that.data.fetchImageUrlBase}${allFileIds[i]}`;
                    
                    wx.downloadFile({
                        url: downloadUrl,
                        success: (res) => {
                            if (res.statusCode === 200) {
                                // 下载成功后，直接 resolve 它的本地临时路径
                                resolve(res.tempFilePath); 
                            } else {
                                console.error(`下载预览图 ${allFileIds[i]} 失败, 状态码: ${res.statusCode}`);
                                resolve(null);
                            }
                        },
                        fail: (err) => {
                            console.error(`下载预览图 ${allFileIds[i]} 网络失败:`, err);
                            resolve(null);
                        }
                    });
                }));
            }

            // 更新展示图片，此时 previewUrls 是一个本地临时文件路径的数组
            Promise.all(previewTasks).then(previewUrls => {
                that.setData({
                    // processedDisplayList 现在存储的是路径，和 chooseImage 后的 displayList 一样
                    processedDisplayList: previewUrls.filter(url => url !== null)
                });
            });

            // 设置完整图片列表（这部分逻辑不变，依然存储 fileId 和 type 用于后续批量下载）
            const fullProcessedList = allFileIds.map(id => ({ 
                fileId: id, 
            }));
            
            that.setData({
                processedImageList: fullProcessedList,
            });

            // console.log('--- 检查 processedImageList ---');
            // console.log('刚刚设置到 data 中的 processedImageList 的值是:', that.data.processedImageList);

            
            return allFileIds;
        })
        // ... then, catch, finally 部分代码保持不变 ...
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

// downloadImages 函数的逻辑保持不变，因为它本身就是基于 URL 下载的，非常正确
    downloadImages: function () 
    {
        if (!this.data.processedImageList || !this.data.processedImageList.length) {
        wx.showToast({ title: '请先处理图片', icon: 'none' });
        return;
        }
    
        const imagesToDownload = this.data.processedImageList;
        let successCount = 0;
        let failCount = 0;
        wx.showLoading({ title: '保存中...', mask: true });

        imagesToDownload.forEach((imageInfo, index) => {
            const downloadUrl = `${this.data.fetchImageUrlBase}${imageInfo.fileId}`;
            
            wx.downloadFile({
                url: downloadUrl,
                success: (res) => {
                    if (res.statusCode === 200) {
                        wx.saveImageToPhotosAlbum({
                            filePath: res.tempFilePath,
                            success: () => {
                                successCount++;
                                if (successCount + failCount === imagesToDownload.length) {
                                    wx.hideLoading();
                                    wx.showToast({
                                        title: failCount ? `成功${successCount},失败${failCount}` : '全部保存成功',
                                        icon: failCount ? 'none' : 'success'
                                    });
                                }
                            },
                            fail: (err) => {
                                failCount++;
                                console.error(`保存第 ${index+1} 张图片失败：`, err);
                                if (successCount + failCount === imagesToDownload.length) {
                                    wx.hideLoading();
                                    wx.showToast({ title: `成功${successCount},失败${failCount}`, icon: 'none' });
                                }
                            }
                        });
                    } else {
                        failCount++;
                        if (successCount + failCount === imagesToDownload.length) {
                            wx.hideLoading();
                            wx.showToast({ title: `成功${successCount},失败${failCount}`, icon: 'none' });
                        }
                    }
                },
                fail: (err) => {
                    failCount++;
                    if (successCount + failCount === imagesToDownload.length) {
                        wx.hideLoading();
                        wx.showToast({ title: `成功${successCount},失败${failCount}`, icon: 'none' });
                    }
                }
            });
        });
    }
})