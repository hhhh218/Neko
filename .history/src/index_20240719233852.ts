import { Context, h, Logger, Random, Schema , sleep, Time} from 'koishi'

import { pathToFileURL } from 'url'

import { resolve } from 'path'

import ApiGpt from '@miemiemie/koishi-plugin-gpt-api';

import { randomInt } from 'crypto';

import { config } from 'process';
import { channel } from 'diagnostics_channel';
import { serialize } from 'v8';

export const name = 'neko'

export interface Config {
  key:string,
  sleepTime:number
  randomReply:number
  messagesLength:number
  eachLetterCost:number
  memeCost:number,
  allowPrivateTalkingUsers:Array<string>,
  groups:Array<string>
}



export const Config: Schema<Config> = Schema.object({
  key: Schema.string().required().description('gpt-4o-mini的key'),
  sleepTime:Schema.number().default(1000).description('每次发言后固定的间隔时间'),
  randomReply:Schema.number().default(1).description('随机回复概率，一个0-1之间小数'),
  messagesLength:Schema.number().default(5).description('每几条消息进行一次上报'),
  eachLetterCost:Schema.number().default(480).description('发言时每个字需要等待的时间'),
  memeCost:Schema.number().default(600).description('每次发送表情包需要的时间'),
  allowPrivateTalkingUsers:Schema.array(Schema.string()).description('允许私聊的用户列表'),
  groups:Schema.array(Schema.string()).description('激活的群列表')
})



const fs = require('fs')

const logger = new Logger(name)

let receive = {}

const gptUrl = 'https://api.chatanywhere.com.cn'

const currentDate = new Date();

const formattedDateTime = currentDate.toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

let historyMessages = {}

//程序开始
export function apply(ctx: Context,config:Config) {
  let tmp_random = {}
  let activeGroups = config.groups
  //初始化
  for(let i = 0;i < activeGroups.length;i++){
    historyMessages[activeGroups[i]] = []
    receive[activeGroups[i]] = true
    tmp_random[activeGroups[i]] = 0
  }
  console.log(`${formattedDateTime} 激活的群列表:${activeGroups}`)
  //声明
  const messagesLength = config.messagesLength
  const eachLetterCost = config.eachLetterCost
  const random = config.randomReply
  const sleepTime = config.sleepTime
  const key = config.key
  //读取prompt
  const prompt = fs.readFileSync('./external/Neko/prompt.txt','utf-8')
  const apiGPT = new ApiGpt(ctx,{
    apiKey: key,
    model:'gpt-4o-mini',
    reverseProxySwitch: true,
    reverseProxy: 'https://api.chatanywhere.com.cn',
  })

  console.log(`${formattedDateTime} 插件启动`)
  console.log(`${formattedDateTime} prompt:${prompt}`)

  //监听消息
  ctx.on('message',async (session) => {
    //私聊处理
    //console.log(historyMessages[session.channelId])
    if(session.isDirect){
      console.log(`${formattedDateTime} 收到一条私聊消息 ${session.content}`)
      if(!(session.userId in config.allowPrivateTalkingUsers)){
        session.send('四呵不让我和陌生人讲话')
        session.send(h.image(pathToFileURL(resolve('./memes', `拒绝.png`)).href))
        return
      }
    }
    console.log(receive)
    console.log(activeGroups.includes(session.channelId))
    //检测队列及请求回复
    if(activeGroups.includes(session.channelId) && receive[session.channelId] == true){
      console.log(receive)
      console.log(historyMessages[session.channelId])
      historyMessages[session.channelId].push(SerializeMessage(session))
      console.log(`${formattedDateTime} 群聊 ${session.channelId} 收到一条消息 ${session.content}
        \n目前群聊${session.channelId}队列${historyMessages[session.channelId].length}/${messagesLength}`)
      if(historyMessages[session.channelId].length >= messagesLength){
        tmp_random[session.channelId] = Math.random()
        if(tmp_random[session.channelId] < random){
          console.log(`${formattedDateTime} 消息队列已满，发送请求`)
          receive[session.channelId] = false
          let tmp_return = await getAIReply(historyMessages[session.channelId],apiGPT,prompt)
          let reply = tmp_return['reply']
          let emoji = tmp_return['emoji']
          console.log(`${formattedDateTime} 群聊${session.channelId}取得回复:${reply.toString()}\nemoji:${emoji}`)
          for(let i = 0;i<reply.length;i++){
            await new Promise(resolve => setTimeout(resolve, eachLetterCost * reply[i].length));
            session.send(reply[i].replace('""',""))
          }
          //发送表情
          if(emoji != null){
            if(emoji == '万用'){
              emoji = emoji + randomInt(1,2).toString()
            }
            sleep(500)
            session.send(h.image(pathToFileURL(resolve('./memes', `${emoji}.png`)).href))
          }
          historyMessages[session.channelId] = []
          sleep(sleepTime)
          receive[session.channelId] = true
        }else if(tmp_random[session.channelId] > random){
          historyMessages[session.channelId] = []
          console.log(`${formattedDateTime} 随机取数决定此次不回复`)
        }
      }
      }
    }
    //队列满则发送请求
    // if(session.channelId === activeGroupId && receive == true){
    //   console.log(`${formattedDateTime} 收到一条消息 ${session.content}
    //     \n目前暂存消息数${historyMessages.length}/${messagesLength}
    //     `)
    //   if(historyMessages.length >= messagesLength){
        
    //}
    // console.log(historyMessages.toString())
)
  //主动ai
  // ctx.command('neko <prompt>', 'neko').action(async (_,prompt) => {
  //   logger.debug(prompt,prompt)
  //   const res = await apiGPT.ask(prompt,'1')
  //   _.session.send(res['text'])
  // })


  //查看暂存消息列表
  ctx.command('LM').action((_) => {
    //historyMessages.pop()
    console.log(`${formattedDateTime} ${historyMessages.toString()}`)
    _.session.send('已输出至console');
  })
}


function SerializeMessage(session){
  let message =
  `
  发送时间:${formattedDateTime}\n
  发送者:${session.author.username}\n
  发送内容:${session.content}
  `
  console.log(`${formattedDateTime} 序列化一个信息 ${message} ${session.channelId}`)
  return message
}

function GetEmoji(str) {
  const regex = /\[(.*?)\]/;

  const match = str.match(regex);

  if (match) {
    return match[1];
  } else {
    return null;
  }
}

function removeEmoji(str) {
  const regex = /\[(.*?)\]/g;

  let result = str.replace(regex, '');

  return result;
}

async function getAIReply(messages:string[],gpt:ApiGpt,prompt){
        let apiGPT = gpt
        const res = await apiGPT.ask(prompt+messages.toString(), '1')
        let content = res['text']
        console.log(`${formattedDateTime} AI返回内容:${content}`)
        historyMessages = []
        // if(res['text'] == 'ERROR'){
        //   session.send('这是可以说的吗')
        // }
        //处理表情
        let emoji = GetEmoji(content)
        console.log(`${formattedDateTime} 表情:${emoji}`)
        content = content.replace(emoji,'')
        content = content.replace("[]","")
        content = content.replace(emoji,'')
        content = content.replace("[]","")
        //处理ai返回内容
        const symbols = '，。“”‘’,.！？\'\'\"\"'; // 定义分割符号
        const regex = new RegExp('[' + symbols + ']', 'g');
        let reply:string[] = content.split(regex)
        return {
          'reply':reply,
          'emoji':emoji
        }
}