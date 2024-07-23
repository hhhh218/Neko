# koishi-plugin-neko-chatbot

[![npm](https://img.shields.io/npm/v/koishi-plugin-neko?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-neko)

## 仿真度高可以发表情的ai群友，~~甚至可以私聊当女友(划掉~~

------

#### 预览

##### 群聊

![P1](./P1.png)

![P2](./P2.png)

##### 单人

![SP1](SP1.jpg)

![SP2](./SP2.jpg)

**默认prompt中未添加流行词与网络梗，可自行添加，仿真度可能会更高**

#### 支持的功能

- 群聊中参与聊天

- 群聊中被提及回复

- 发送表情

- 单人私聊聊天

  #### TODO

  - [x] 群聊中被@回复
  
  - [ ] 支持多人私人聊天
  
  - [ ] 接GPT-Sovits发送语音
  
  - [x] 同一含义更多表情
  
    ### 配置
  
    关于表情包，应在配置中填入的**memePath**目录放好这些路径，每个路径下可以放相同的表情
  
    ![newmeme](./new_meme.png)
    
    只有这几个名称的表情会被启用，下个版本可能会支持自定义表情
    
    （从1.1.2版本开始，表情配置重构，以下方法为1.1.2之前版本的配置）
    
    关于表情包，应在配置中填入的**memePath**目录放好这些文件
    
    ~~![meme](./meme.jpg)~~

~~文件名应与**prompt**与**singlePrompt**中给出的表情列表相同，若无修改则按上图命名~~

~~万用表情包必须存在两个，**万用1**和**万用2**~~

