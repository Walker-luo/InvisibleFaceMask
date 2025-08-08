// pages/simple.js
Page({

  data: {
    statusBarHeight: 0,      // 准备一个变量，用来存储状态栏高度
    imageList: [],    // 存储所有选中图片的路径
    processedImageList: [], // 存储处理/上传后的图片URL列表 (现在存储fileId和type)
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
      // 1. 修改count，允许最多选择9张
      count: 9, 
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res && res.tempFiles && res.tempFiles.length > 0) {
          // 2. 获取所有选中图片的临时路径
          const allSelectedPaths = res.tempFiles.map(file => file.tempFilePath);
    
          // 3. 更新data中的数据
          this.setData({
            imageList: allSelectedPaths,
            processedImageList: [], // 重置处理后的列表
          });

          console.log("总共选择了 " + allSelectedPaths.length + " 张图片");
          console.log("待上传的图片列表:", this.data.imageList);
        }
        this.processImages();
      },
      fail: (err) => {
        // 用户取消选择时也会进入fail，可以不用提示错误
        if (err.errMsg !== "chooseMedia:fail cancel") {
            console.error("选择图片失败：", err);
        }
      }
    });
  },

      // 4. 处理图片（上传并获取处理结果） - (集成自您的代码)
    processImages: function() {
        return new Promise((resolve, reject) => {
            if (this.data.imageList.length === 0) {
                wx.showToast({ title: '请先选择图片', icon: 'none' });
                return reject(new Error('没有选择图片'));
            }
            
            const that = this;
            that.setData({ isProcessing: true });
            wx.showLoading({ title: '处理中...', mask: true });
        
            const uploadTasks = this.data.imageList.map(filePath => {
                return new Promise((uploadResolve, uploadReject) => {
                    wx.uploadFile({
                        url: that.data.uploadUrl,
                        filePath: filePath,
                        name: 'image_file',
                        formData: { filename: filePath.split('/').pop() },
                        success: (uploadRes) => {
                            if (uploadRes.statusCode === 200) {
                                const data = JSON.parse(uploadRes.data);
                                if (data && data.success) {
                                    uploadResolve({ fileId: data.file_id });
                                } else {
                                    uploadReject(new Error(data?.message || '上传失败'));
                                }
                            } else {
                                uploadReject(new Error(`HTTP错误: ${uploadRes.statusCode}`));
                            }
                        },
                        fail: (err) => uploadReject(new Error('网络连接失败'))
                    });
                });
            });

            Promise.all(uploadTasks)
            .then(metadataResults => {
                const allFileIds = metadataResults.map(item => item.fileId);

                // 更新核心数据：处理后的所有图片的ID列表
                const fullProcessedList = allFileIds.map(id => ({ fileId: id }));
                that.setData({ processedImageList: fullProcessedList });

                const previewTasks = allFileIds.map(fileId => {
                    return new Promise(previewResolve => {
                        const downloadUrl = `${that.data.fetchImageUrlBase}${fileId}`;
                        wx.downloadFile({
                            url: downloadUrl,
                            success: (res) => previewResolve(res.statusCode === 200 ? res.tempFilePath : null),
                            fail: () => previewResolve(null)
                        });
                    });
                });

                return Promise.all(previewTasks).then(previewUrls => {
                    that.setData({
                        processedImageList: previewUrls.filter(url => url !== null)
                    });
                    console.log('processedImageList 的值是:', that.data.processedImageList);
                });
            })
            .then(() => {
                wx.showToast({ title: `成功处理${that.data.processedImageList.length}张图片` });
                resolve(); // 整个 processImages 成功
            })
            .catch(err => {
                console.error('处理流程错误', err);
                wx.showToast({ title: `失败: ${err.message}`, icon: 'none', duration: 3000 });
                reject(err); // 整个 processImages 失败
            })
            .finally(() => {
                that.setData({ isProcessing: false });
                wx.hideLoading();
            });
        });
    },

    downloadImages: function() {
        // 检查包含临时路径的 displayList，而不是包含 fileId 的 imageList
        if (!this.data.processedImageList || !this.data.processedImageList.length) {
            wx.showToast({ title: '没有可保存的图片', icon: 'none' });
            return;
        }

        // 权限检查逻辑保持不变，这是非常好的实践
        wx.getSetting({
            success: (res) => {
                if (res.authSetting['scope.writePhotosAlbum']) {
                    // 已授权，直接开始保存
                    this.startBatchSave(); // 调用已优化的新函数名
                } else if (res.authSetting['scope.writePhotosAlbum'] === false) {
                    // 用户曾拒绝，引导去设置页
                    wx.showModal({
                        title: '授权提示',
                        content: '需要您的授权才能保存图片到相册，是否去设置中开启？',
                        success: (modalRes) => {
                            if (modalRes.confirm) {
                                wx.openSetting({
                                    success: (settingRes) => {
                                        if (settingRes.authSetting['scope.writePhotosAlbum']) {
                                            this.startBatchSave();
                                        } else {
                                            wx.showToast({ title: '您未授权', icon: 'none' });
                                        }
                                    }
                                });
                            }
                        }
                    });
                } else {
                    // 从未询问过，发起授权请求
                    wx.authorize({
                        scope: 'scope.writePhotosAlbum',
                        success: () => this.startBatchSave(),
                        fail: () => wx.showToast({ title: '您拒绝了授权', icon: 'none' })
                    });
                }
            }
        });
    },

    // 6. 批量保存辅助函数
    startBatchSave: function() {
        // 直接使用包含临时文件路径的processedImageList
        const imagesToSave = this.data.processedImageList;
        const totalCount = imagesToSave.length;
        if (totalCount === 0) return;
        
        let successCount = 0;
        let failCount = 0;

        // 使用递归函数实现串行保存
        const saveNext = (index) => {
            if (index >= totalCount) {
                wx.hideLoading();
                wx.showToast({
                    title: failCount > 0 ? `成功${successCount}, 失败${failCount}` : '全部保存成功',
                    icon: failCount > 0 ? 'none' : 'success'
                });
                return;
            }

            wx.showLoading({ title: `正在保存 ${index + 1}/${totalCount}`, mask: true });
            
            // 直接从数组中获取已下载好的本地临时路径
            const tempFilePath = imagesToSave[index];

            // **核心优化**: 跳过 wx.downloadFile，直接调用 wx.saveImageToPhotosAlbum
            wx.saveImageToPhotosAlbum({
                filePath: tempFilePath,
                success: () => {
                    successCount++;
                },
                fail: (err) => {
                    failCount++;
                    console.error(`保存图片 ${tempFilePath} 失败:`, err);
                },
                complete: () => {
                    // 无论成功或失败，都继续处理下一张
                    saveNext(index + 1);
                }
            });
        };

        // 从第一张图片(索引为0)开始执行保存链
        saveNext(0);
    },

    // “分享朋友圈”按钮的事件处理函数
    shareToTimelineHandler: function() {
        // 这个函数不直接分享，而是引导用户去点击右上角菜单
        // 这是微信官方推荐的、唯一能触发朋友圈分享的方式
        wx.showShareMenu({
            menus: ['shareTimeline'], // 在菜单中只显示“分享到朋友圈”
            success: () => {
                wx.showToast({
                    title: '请点击右上角 ...，再选择“分享到朋友圈”',
                    icon: 'none',
                    duration: 3000 // 提示持续3秒
                });
            },
            fail: (err) => {
                console.error('拉起朋友圈分享菜单失败', err);
                wx.showToast({
                    title: '操作失败，请稍后重试',
                    icon: 'none'
                });
            }
        });
    },

    // 监听用户"转发给朋友"的动作
    onShareAppMessage: function (res) {
        if (this.data.processedImageList.length === 0) {
            // 返回一个默认的、通用的分享卡片
            return {
                title: '快来试试这个智能图片处理工具！',
                path: '/pages/simple/simple' // 分享到首页
            };
        }

        // 使用处理后的第一张图片作为分享卡片的封面
        const firstImageId = this.data.processedImageList[0].fileId;
        const shareImageUrl = `${this.data.fetchImageUrlBase}${firstImageId}`;

        return {
            title: '我处理好了一批新照片，快来看看效果！',
            // 将第一张图片的ID作为参数传出去，对方点开就能看到
            path: `/pages/simple/simple?share_id=${firstImageId}`,
            imageUrl: shareImageUrl
        };
    },

    // 监听用户"分享到朋友圈"的动作
    onShareTimeline: function () {
        if (this.data.processedImageList.length === 0) {
            return {};
        }

        const firstImageId = this.data.processedImageList[0].fileId;
        const shareImageUrl = `${this.data.fetchImageUrlBase}${firstImageId}`;

        return {
            title: '推荐一个超赞的图片处理小程序，效果太棒了！',
            // 用户从朋友圈点进来时，可以在 onLoad 的 query 中拿到这个 id
            query: `share_id=${firstImageId}`,
            imageUrl: shareImageUrl
        };
    },

    // // 页面加载，处理从分享卡片进入的场景 (此函数无需任何修改)
    // onLoad: function(options) {
    //     if (options.share_id) {
    //         wx.showLoading({ title: '加载分享中...' });
    //         const sharedImageUrl = `${this.data.fetchImageUrlBase}${options.share_id}`;
    //         wx.downloadFile({
    //             url: sharedImageUrl,
    //             success: (res) => {
    //                 if (res.statusCode === 200) {
    //                     this.setData({
    //                         // 将分享的这张图片放入处理结果预览区
    //                         processedDisplayList: [res.tempFilePath],
    //                         // 清空其他列表，提供一个干净的分享预览页
    //                         imageList: [],
    //                         processedImageList: []
    //                     });
    //                 }
    //             },
    //             complete: () => {
    //                 wx.hideLoading();
    //             }
    //         });
    //     }
    // }

})