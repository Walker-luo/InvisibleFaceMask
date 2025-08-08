// pages/simple/simple.js
Page({
    data: {
        // --- 基础UI和状态 ---
        statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
        imageList: [], // 存储用户选择的原始图片的临时路径
        displayList: [], // 用于在界面上预览的原始图片列表（最多9张）
        selectedActions: ['process'], // 用户勾选的操作，默认为"处理图片"
        isProcessing: false, // 是否正在处理中，用于禁用按钮

        // --- 处理结果数据 ---
        // 存储处理后图片的 fileId，这是核心数据，用于后续下载和分享
        // 格式: [{ fileId: 'id1' }, { fileId: 'id2' }, ...]
        processedImageList: [], 
        // 存储处理后用于预览的图片的临时路径（最多3张）
        processedDisplayList: [],

        // --- 后端API配置 (重要：请替换成您自己的URL) ---
        uploadUrl: 'https://your-server.com/api/upload', // 您的图片上传接口
        fetchImageUrlBase: 'https://your-cdn.com/images/' // 您的图片访问URL前缀
    },

    // 1. 用户选择图片
    chooseImage: function () {
        if (this.data.isProcessing) return; // 处理中则不响应
        wx.chooseMedia({
            count: 20,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                this.setData({
                    imageList: res.tempFiles.map(file => file.tempFilePath),
                    displayList: res.tempFiles.map(file => file.tempFilePath).slice(0, 9), // UI上最多预览9张
                    // 重置处理结果
                    processedImageList: [],
                    processedDisplayList: []
                });
            }
        });
    },

    // 2. 监听用户勾选的操作
    onActionChange: function (e) {
        this.setData({
            selectedActions: e.detail.value
        });
    },

    // 3. 点击"开始执行"按钮，总调度函数
    executeActions: async function () {
        const { imageList, selectedActions, isProcessing } = this.data;

        if (imageList.length === 0) {
            wx.showToast({ title: '请先选择图片', icon: 'none' });
            return;
        }
        if (selectedActions.length === 0) {
            wx.showToast({ title: '请勾选操作', icon: 'none' });
            return;
        }
        if (isProcessing) return;

        // 【核心流程控制】
        try {
            // 步骤一：处理图片（如果勾选或后续操作依赖它）
            // 只要勾选了下载或分享，就必须先执行处理
            if (selectedActions.includes('process') || selectedActions.includes('download') || selectedActions.includes('share_friends') || selectedActions.includes('share')) {
                await this.processImages(); // 等待图片处理完成
            }

            // 步骤二：自动下载（如果勾选了）
            if (selectedActions.includes('download')) {
                // 不必等待下载完成，可以立即提示用户去分享
                this.downloadImages();
            }

            // 步骤三和四：引导分享
            if (selectedActions.includes('share_friends') || selectedActions.includes('share')) {
                wx.showModal({
                    title: '可以分享啦',
                    content: '图片已处理完成，请点击右上角 [...] 进行分享。',
                    showCancel: false,
                    confirmText: '我知道了'
                });
            }

        } catch (error) {
            // processImages内部的错误会在这里被捕获
            console.error("执行流程出错: ", error);
            // processImages 内部已经有 toast 提示，这里可以不再重复提示
        }
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

                // 下载前3张作为界面预览
                const previewLimit = Math.min(3, allFileIds.length); 
                if (previewLimit === 0) {
                    return Promise.resolve(); // 如果没有成功上传的图片，直接进入下一步
                }

                const previewTasks = allFileIds.slice(0, previewLimit).map(fileId => {
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
                        processedDisplayList: previewUrls.filter(url => url !== null)
                    });
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

    // 5. 下载图片（含权限处理）- (集成自您的代码)
    downloadImages: function() {
        if (!this.data.processedImageList || !this.data.processedImageList.length) {
            wx.showToast({ title: '请先处理图片', icon: 'none' });
            return;
        }
        wx.getSetting({
            success: (res) => {
                if (res.authSetting['scope.writePhotosAlbum']) {
                    this.startBatchDownload();
                } else if (res.authSetting['scope.writePhotosAlbum'] === false) {
                    wx.showModal({
                        title: '授权提示',
                        content: '需要您的授权才能保存图片到相册，是否去设置中开启？',
                        success: (modalRes) => {
                            if (modalRes.confirm) {
                                wx.openSetting({
                                    success: (settingRes) => {
                                        if (settingRes.authSetting['scope.writePhotosAlbum']) {
                                            this.startBatchDownload();
                                        } else {
                                            wx.showToast({ title: '您未授权', icon: 'none' });
                                        }
                                    }
                                });
                            }
                        }
                    });
                } else {
                    wx.authorize({
                        scope: 'scope.writePhotosAlbum',
                        success: () => this.startBatchDownload(),
                        fail: () => wx.showToast({ title: '您拒绝了授权', icon: 'none' })
                    });
                }
            }
        });
    },

    // 6. 批量下载辅助函数 - (集成自您的代码)
    startBatchDownload: function() {
        const imagesToDownload = this.data.processedImageList;
        const totalCount = imagesToDownload.length;
        if (totalCount === 0) return;
        
        let successCount = 0, failCount = 0;

        const downloadNext = (index) => {
            if (index >= totalCount) {
                wx.hideLoading();
                wx.showToast({
                    title: failCount ? `成功${successCount},失败${failCount}` : '全部保存成功',
                    icon: failCount ? 'none' : 'success'
                });
                return;
            }

            wx.showLoading({ title: `正在保存 ${index + 1}/${totalCount}`, mask: true });
            const downloadUrl = `${this.data.fetchImageUrlBase}${imagesToDownload[index].fileId}`;

            wx.downloadFile({
                url: downloadUrl,
                success: (res) => {
                    if (res.statusCode === 200) {
                        wx.saveImageToPhotosAlbum({
                            filePath: res.tempFilePath,
                            success: () => successCount++,
                            fail: () => failCount++,
                            complete: () => downloadNext(index + 1)
                        });
                    } else {
                        failCount++;
                        downloadNext(index + 1);
                    }
                },
                fail: () => {
                    failCount++;
                    downloadNext(index + 1);
                }
            });
        };
        downloadNext(0);
    },

    // 7. 监听用户"转发给朋友"的动作
    onShareAppMessage: function (res) {
        // 条件检查：必须勾选了“分享给好友”且有处理好的图片
        if (!this.data.selectedActions.includes('share_friends') || this.data.processedImageList.length === 0) {
            wx.showToast({
                title: '请先处理并勾选分享',
                icon: 'none'
            });
            // 返回默认分享，或阻止分享
            return {
                title: '快来试试这个智能图片处理工具！',
                path: '/pages/simple/simple'
            };
        }

        // 使用处理后的第一张图片作为分享卡片的封面
        // 【重要】这里的 imageUrl 必须是公网可访问的真实图片URL
        const firstImageId = this.data.processedImageList[0].fileId;
        const shareImageUrl = `${this.data.fetchImageUrlBase}${firstImageId}`;

        return {
            title: '我处理好了一批新照片，快来看看效果！',
            // 将第一张图片的ID作为参数传出去，对方点开就能看到
            path: `/pages/simple/simple?share_id=${firstImageId}`,
            imageUrl: shareImageUrl
        };
    },

    // 8. 监听用户"分享到朋友圈"的动作
    onShareTimeline: function () {
        // 条件检查：必须勾选了“分享朋友圈”且有处理好的图片
        if (!this.data.selectedActions.includes('share') || this.data.processedImageList.length === 0) {
            // 返回空对象，微信会提示“无法分享到朋友圈”
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

    // 9. 页面加载，处理从分享卡片进入的场景
    onLoad: function(options) {
        // 检查页面启动参数中是否有 'share_id'
        if (options.share_id) {
            wx.showLoading({ title: '加载分享中...' });
            const sharedImageUrl = `${this.data.fetchImageUrlBase}${options.share_id}`;
            // 下载分享的图片，以便在界面上展示
            wx.downloadFile({
                url: sharedImageUrl,
                success: (res) => {
                    if (res.statusCode === 200) {
                        this.setData({
                            // 将分享的这张图片放入处理结果预览区
                            processedDisplayList: [res.tempFilePath],
                            // 清空其他列表，提供一个干净的分享预览页
                            imageList: [],
                            displayList: [],
                            processedImageList: []
                        });
                    }
                },
                complete: () => {
                    wx.hideLoading();
                }
            });
        }
    }
});