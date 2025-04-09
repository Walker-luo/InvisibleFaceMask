Component({
    /**
     * 组件的属性列表
     * num 图片数量 默认可以5张
     */
    properties: {
      num:{
        type:Number,
        value:5
      }
   
    },
    options: {
      addGlobalClass: true
  },
   
   
    /**
     * 组件的初始数据
     */
    data: {
      picList:[],
      imageUrl: [],
   
   
    },
   
    /**
     * 组件的方法列表
     */
    methods: {
      chooseImage: function () {
        let that = this,
            picList = this.data.picList
        wx.chooseImage({
            count: that.properties.num.value - picList.length, // 最多可以选择的图片张数，默认9
            sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
            sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
            success: function (res) {
                let imgsrc = res.tempFilePaths
                picList = picList.concat(imgsrc);                
                that.setData({ picList: picList })
            }
        })
    },
    // 去除图片
    deleteImg: function (event) {
      var that = this
      var index = event.currentTarget.dataset.index
      wx.showModal({
          title: '温馨提示',
          content: '您确定要删除这张照片吗？',
          success: function (res) {
              if (res.confirm) {
                  var arr = that.data.picList
                  var newArr = arr.splice(index, 1)
                  that.setData({
                      picList: arr
                  })
              } else if (res.cancel) {
                  console.log('用户点击取消')
              }
          }
      })
    },
    // 上传完成后通过自定义事件来给父组件传递返回后的url
    async handleUpload() {
      try {
        // 循环上传每一张图片，并将上传后的地址存入 data.imageUrl 数组
        const uploadedUrls = [];
        for (let i = 0; i < this.data.picList.length; i++) {
          const url = this.data.picList[i];
          const result = await this.uploadFile(url);
          uploadedUrls.push(result.data.imgUrl);
        }
        this.setData({
          imageUrl: uploadedUrls,
        });
        // 通过 triggerEvent 触发自定义事件，并将上传后的地址数组传递给父组件
        this.triggerEvent('uploadSuccess', { urls: uploadedUrls });
      } catch (error) {
        console.error(error);
      }
    },
    // 文件上传方法
    uploadFile(url) {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: api.getUrl('upload_img'),//
          filePath: url,
          name: 'image',
          success: (res) => {
            const result = JSON.parse(res.data);
            resolve(result);
          },
          fail: (error) => {
            reject(error);
          },
        });
      });
    },
   
    }
  })