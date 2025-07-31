// index.js

Page({
    // ... data 和其他函数
  
    // 使用你的两步式交互逻辑重写 processImages 函数
    async processImages() {
      // 1. 基础检查
      if (this.data.imageList.length === 0) {
        wx.showToast({
          title: '请先上传图片',
          icon: 'none'
        });
        return;
      }
      if (this.data.isProcessing) {
        wx.showToast({ title: '正在处理中...', icon: 'none' });
        return;
      }
  
      // 2. 设置状态，准备处理
      this.setData({ isProcessing: true });
      wx.showLoading({ title: '准备上传处理...' });
  
      // 3. 为每张图片创建一个上传任务 (Promise)
      const uploadTasks = this.data.imageList.map((filePath, index) => {
        return new Promise((resolve, reject) => {
          
          wx.showLoading({ title: `处理第 ${index + 1} 张` });
  
          // 第1步：上传图片到 /process_image
          wx.uploadFile({
            url: this.data.uploadUrl, // 使用 data 中配置的上传地址
            filePath: filePath,
            name: 'image', // 这个 'image' 必须和 Flask 后端 request.files['image'] 对应
  
            success: (res) => {
              // 检查服务器HTTP响应状态
              if (res.statusCode === 200) {
                // wx.uploadFile 返回的 res.data 是一个字符串，需要手动解析
                const responseData = JSON.parse(res.data);
  
                // 检查业务逻辑是否成功
                if (responseData.status === 'success' && responseData.file_id) {
                  
                  // 第2步：用返回的 file_id 构造最终的图片URL
                  const finalImageUrl = `${this.data.downloadBaseUrl}/${responseData.file_id}/protected`;
                  
                  // 这个 Promise 成功完成，返回最终的图片URL
                  resolve(finalImageUrl);
  
                } else {
                  // 后端返回了业务错误
                  console.error(`图片 ${index + 1} 处理失败:`, responseData.message);
                  reject(new Error(responseData.message || '服务器处理失败'));
                }
              } else {
                // HTTP 状态码非 200
                console.error(`图片 ${index + 1} 上传失败，状态码:`, res.statusCode);
                reject(new Error(`服务器错误，状态码: ${res.statusCode}`));
              }
            },
            fail: (err) => {
              // wx.uploadFile 接口本身调用失败 (如网络问题)
              console.error(`图片 ${index + 1} 上传接口调用失败:`, err);
              reject(err);
            }
          });
        });
      });
  
      // 4. 等待所有上传任务完成
      // Promise.allSettled 会等待所有任务，无论成功或失败，这很适合批量处理
      const results = await Promise.allSettled(uploadTasks);
      wx.hideLoading();
  
      // 5. 收集成功处理后的图片URL
      const processedUrls = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processedUrls.push(result.value);
        } else {
          // 对于失败的任务，可以给出提示
          console.log(`第 ${index + 1} 张图片处理失败:`, result.reason.message);
        }
      });
  
      // 6. 更新页面数据
      if (processedUrls.length > 0) {
        this.setData({
          processedImageList: processedUrls,
          processedDisplayList: processedUrls.slice(0, 3) // 仅预览前3张
        });
        wx.showToast({
          title: `${processedUrls.length}张处理成功`,
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '所有图片处理失败',
          icon: 'error'
        });
      }
      
      // 7. 恢复处理状态
      this.setData({ isProcessing: false });
    },
  
    // ... 其他函数
  });