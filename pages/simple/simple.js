// pages/simple.js
Page({

  data: {
    statusBarHeight: 0,      // 准备一个变量，用来存储状态栏高度
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
          const displayPaths = allSelectedPaths.slice(0, 3);

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

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})