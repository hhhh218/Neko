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
  privateRefuse:string
  singleAskSleep:number
  singleTalkWaiting:number
}



export const Config: Schema<Config> = Schema.object({
  key: Schema.string().required().description('gpt-4o-mini的key'),
  sleepTime:Schema.number().default(1000).description('每次发言后固定的间隔时间'),
  randomReply:Schema.number().default(1).description('随机回复概率，一个0-1之间小数'),
  messagesLength:Schema.number().default(5).description('每几条消息进行一次上报'),
  eachLetterCost:Schema.number().default(480).description('发言时每个字需要等待的时间'),
  memeCost:Schema.number().default(600).description('每次发送表情包需要的时间'),
  allowPrivateTalkingUsers:Schema.array(Schema.string()).description('允许私聊的用户列表'),
  groups:Schema.array(Schema.string()).description('激活的群列表'),
  privateRefuse:Schema.string().description('私聊拒绝回复'),
  singleAskSleep:Schema.number().default(1000).description('单次询问后等待时间'),
  singleTalkWaiting:Schema.number().default(12000).description('单次私聊等待时间')
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

let singleAsk = {}

let lastMessageTime = 0

let waiting = false

let historyMessages = {}

let singleMessages = []

let intervalId;

let tmp_sM

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
  const singlePrompt = fs.readFileSync('./external/Neko/single_prompt.txt','utf-8')
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
    //提及回复
    const regex = /^neko/i;
    if(regex.test(session.content) && session.content.length < 30 && session.isDirect == false){
      //console.log(`${formattedDateTime} ${singleAsk[session.author.user.id]}`)
      if(singleAsk[session.author.user.id] === undefined)
        singleAsk[session.author.user.id] = true
      console.log(`${formattedDateTime} Neko在群聊${session.channelId}被${session.author.user.name}(${session.author.user.id})提及：${session.content}`)
      if(singleAsk[session.author.user.id] == false){
        console.log(`${formattedDateTime} Neko拒绝回答，因为此人还在冷却期间`)
        return
      }
      let a = []
      a.push(SerializeMessage(session))
      let tmp_return = await getAIReply(a,apiGPT,prompt,session.channelId)
          let reply = tmp_return['reply']
          let emoji = tmp_return['emoji']
          console.log(`${formattedDateTime} 群聊${session.channelId}取得回复:${reply.toString()}\nemoji:${emoji}`)
          singleAsk[session.author.user.id] = false
          sendReply(session,reply,emoji,eachLetterCost)
          sleep(config.singleAskSleep)
          singleAsk[session.author.user.id] = true
          return;
    }
    //私聊处理
    //console.log(historyMessages[session.channelId])
    historyMessages[session.userId] = []
    if(session.isDirect){
      console.log(`${formattedDateTime} 收到一条私聊消息 ${session.content}`)
      if(!(config.allowPrivateTalkingUsers.includes(session.author.user.id))){
        sleep(eachLetterCost * config.privateRefuse.length)
        session.send(config.privateRefuse)
        sleep(1000)
        session.send(h.image(pathToFileURL(resolve('./memes', `拒绝.png`)).href))
        return
      }else{
        console.log(`${formattedDateTime} 检测新私聊消息 ${session.content}`)
        singleMessages.push(SerializeMessage(session))
        lastMessageTime = Date.now();
        if (intervalId) {
            clearInterval(intervalId);
        }
        intervalId = setInterval(async () => {
            if (Date.now() - lastMessageTime > 7000) {
                console.log('7秒内没有收到新消息');
                clearInterval(intervalId);
                console.log('我到这啦')
                let tmp_return = await getAIReply(singleMessages,apiGPT,singlePrompt,session.author.user.id)
                let reply = tmp_return['reply']
                let emoji = tmp_return['emoji']
                console.log(`${formattedDateTime} 私聊${session.userId}取得回复:${reply}\nemoji:${emoji}`)
                sendReply(session,reply,emoji,eachLetterCost)
            }
        }, 7000);
      }
    }
    console.log(receive)
    console.log(activeGroups.includes(session.channelId))
    //检测队列及请求回复
    if(activeGroups.includes(session.channelId) && receive[session.channelId] == true && session.isDirect == false){
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
          let tmp_return = await getAIReply(historyMessages[session.channelId],apiGPT,prompt,session.channelId)
          let reply = tmp_return['reply']
          let emoji = tmp_return['emoji']
          console.log(`${formattedDateTime} 群聊${session.channelId}取得回复:${reply}\nemoji:${emoji}`)
          sendReply(session,reply,emoji,eachLetterCost)
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
    
)
  ctx.command('neko<prompt>').action(async (_,prompt) => {
    logger.debug(prompt,prompt)
    const res = await apiGPT.ask(prompt,'1')
    _.session.send(res['text'])
  })
  setInterval(() => {
    if (Date.now() - lastMessageTime > 120000) {
        console.log('120秒内没有收到新消息，停止检测');
        clearInterval(intervalId);
        // 在这里处理没有新消息的情况
        singleMessages = []
    }
}, 120000);

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
  //console.log(`${formattedDateTime} 序列化一个信息 ${message} ${session.channelId}`)
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

async function getAIReply(messages:string[],gpt:ApiGpt,prompt,channelId){
        let apiGPT = gpt
        const res = await apiGPT.ask(prompt+messages.toString(), '1')
        let content = res['text']
        console.log(`${formattedDateTime} AI返回内容:${content}`)
        historyMessages[channelId] = []
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
function sendReply(session,text,emoji,eachLetterCost){
  for(let i = 0;i<text.length;i++){
    sleep(eachLetterCost * text[i].length)
    session.send(text[i].replace('""',""))
  }
  //发送表情
  if(emoji != null){
    if(emoji == '万用'){
      emoji = emoji + randomInt(1,2).toString()
    }
    sleep(500)
    session.send(h.image(pathToFileURL(resolve('./memes', `${emoji}.png`)).href))
  }
}