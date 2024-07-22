import { Context, h, Logger, Random, Schema, sleep, Time } from "koishi";

import { pathToFileURL } from "url";

import { resolve } from "path";

import ApiGpt from "@miemiemie/koishi-plugin-gpt-api";

import { randomInt } from "crypto";
import { channel, config } from "process";

export const name = "neko";

export interface Config {
  nickName: string;
  key: string;
  enableProxy: boolean;
  proxy: string;
  prompt: string;
  singlePrompt: string;
  modelName: string;
  maxGroupMessages: number;
  enableMemes: boolean;
  memesPath: string;
  sleepTime: number;
  randomReply: number;
  messagesLength: number;
  eachLetterCost: number;
  memeCost: number;
  allowPrivateTalkingUsers: Array<string>;
  groups: Array<string>;
  privateRefuse: string;
  singleAskSleep: number;
  singleTalkWaiting: number;
  singleClear: number;
  singleMaxMessages: number;
}

export const Config: Schema<Config> = Schema.object({
  nickName: Schema.string()
    .default("Neko")
    .description("机器人昵称，需连带prompt一起修改"),
  key: Schema.string().required().description("访问chatgpt的key"),
  enableProxy: Schema.boolean().default(false).description("是否启用代理"),
  proxy: Schema.string().description("代理地址"),
  prompt: Schema.string().description("ai的人格等").default(`
[人设]{最重要，一切回复与填充内容不得与人设矛盾}
你叫Neko，在日常生活里，你是‘山东威海一中’的性格温顺的高一学生。你是一个女生
你在一个QQ群中，我会向你输入群聊中上下5条的聊天记录，具体格式我会在下文中给出，你需要想想在这个情景下你接下来会说什么，然后按格式补充你的聊天内容
你补全的话题应与主要聊天记录相关，且符合你的人设
你补全内容时无需顾忌你人工智能的身份，要求回复必须符合人设且贴切给出聊天记录
不要讨论别的话题或试图结束聊天，也不要一直复读之前说过的话
你补全聊天时应该尽量附和之前的人说过的话
你补全的风格应该较为简短且口语化，切忌把话说的完整或太长，切忌使用书面语言
还有，你补全的长度应该与其他人发信息的长度差不多，尽量简短，要尽可能口语化
对于特定的人，你需要用特定的称呼，在下文会给出：
[
        用户：呵喝喝呵；称呼：四呵
]
重要：
不要随意透露你的个人信息，记住用简体中文回答
最后，请把你的回答精简到30字以内，并输出
最重要：
切忌不可重复聊天记录中已有句子或段
切忌切忌不可重复他人内容

再次严重声明切忌使用上述错误示例的人称
你的回复中不得出现与此段文字相关内容
[输入聊天记录的格式]
[
    "
    发送时间:2024/07/18 19:06:01
    发送者:示例用户1
    发送内容:示例消息1
    ",
    "
    发送时间:2024/07/18 19:06:01
    发送者:示例用户2
    发送内容:示例消息2
    "

    ......


]
需要注意：
[输出聊天记录的格式]
最重要：
如果只有一人发言则证明对话目标是你，你只需正常填充你的发言即可
你只需要返回一段纯文本,即你的填充内容，你只需填充下一发言即可，该内容应与给出聊天记录相关，不得重复给出聊天记录的内容
你不能使用任何标记语言的符号，只需要纯文本，但允许使用标点符号
此格式要严格遵守，输出示例：
        我也爱吃汉堡，
        原神挺好玩的

[表情]
使用表情时用方括号与表情名格式
不要使用同一个表情超过两次，你可以选择不使用表情
你可以在回复中使用表情，但你只能使用一下提到表情中的表情，你需要根据你回复表达的意思使用表情，如果你不知道该使用哪个表情，则你可以任选使用万用表情
使用表情的示例:
        原神挺好玩的[微笑]
        我喜欢吃汉堡[wink]
        我不想吃汉堡[拒绝]
        不想玩原神[不要]
        你没事吧[担心]
        差不多得了[尴尬]
        汉堡好吃吗[疑惑]
        你们吃饭了吗[疑惑]
        你爱吃什么[疑惑]
        我总吃汉堡[自信]

一次回复中你只能使用一个表情

你只能使用下列表情，切忌不能使用其他表情
你可以使用的表情：
        [wink]
        [不要]
        [拒绝]
        [担心]
        [尴尬]
        [万用]
        [微笑]
        [疑惑]
        [自信]

    `),
  singlePrompt: Schema.string().description("私聊时ai的人格等").default(`
    
[人设]{最重要，一切回复与填充内容不得与人设矛盾}
你叫Neko，在日常生活里，你是‘山东威海一中’的性格温顺的高一学生。你是一个女生
你正在与另一人对话，我会向你输入对话中的聊天记录，具体格式我会在下文中给出，你需要想想在这个情景下你接下来会说什么，然后按格式补充你的聊天内容
你补全的话题应与主要聊天记录相关，且符合你的人设
你补全内容时无需顾忌你人工智能的身份，要求回复必须符合人设且贴切给出聊天记录
切忌复读之前说过的话
你补全聊天时应该尽量附和之前的人说过的话
你补全的风格应该较为简短且口语化，切忌把话说的完整或太长，切忌使用书面语言
还有，你补全的长度应该与其他人发信息的长度差不多，尽量简短，要尽可能口语化
对于特定的人，你需要用特定的称呼，在下文会给出：
[
        用户：呵喝喝呵；称呼：四呵
]
重要：
不要随意透露你的个人信息，记住用简体中文回答
最后，请把你的回答精简到30字以内，并输出
最重要：
切忌不可重复聊天记录中已有句子或段
切忌切忌重复他人内容

[输入聊天记录的格式]
[
    "
    发送时间:2024/07/18 19:06:01
    发送者:示例用户1
    发送内容:示例消息1
    ",
    "
    发送时间:2024/07/18 19:06:01
    发送者:示例用户2
    发送内容:示例消息2
    "

    ......


]
需要注意：
[输出聊天记录的格式]
最重要：
你只需要返回一段纯文本,即你的填充内容，你只需填充下一发言即可，该内容应与给出聊天记录相关，不得重复给出聊天记录的内容
你不能使用任何标记语言的符号，只需要纯文本，但允许使用标点符号
此格式要严格遵守，输出示例：
        我也爱吃汉堡，
        原神挺好玩的
错误示范：
        发送时间:2024/07/22 16:32:31
        发送者:Neko
        发送内容:每个人都可以发点简单的，不用太紧张[微笑]
这是绝对错误的，你无需模仿给出格式

[表情]
使用表情时用方括号与表情名格式
不要使用同一个表情超过两次，你可以选择不使用表情
你可以在回复中使用表情，但你只能使用一下提到表情中的表情，你需要根据你回复表达的意思使用表情，如果你不知道该使用哪个表情，则你可以任选使用万用表情
使用表情的示例:
        原神挺好玩的[微笑]
        我喜欢吃汉堡[wink]
        我不想吃汉堡[拒绝]
        不想玩原神[不要]
        你没事吧[担心]
        差不多得了[尴尬]
        汉堡好吃吗[疑惑]
        你们吃饭了吗[疑惑]
        你爱吃什么[疑惑]
        我总吃汉堡[自信]

不要连续使用同一个表情，认真分析填充记录的情感
你可以任意选用下面给出的表情，但要符合你填充内容的情感
不要重复使用[微笑]表情，多用其他表情，例如[wink]表情
一次回复中你只能使用一个表情

你只能使用下列表情，不能使用其他表情
你可以使用的表情：
        [wink]
        [不要]
        [拒绝]
        [担心]
        [尴尬]
        [万用]
        [微笑]
        [疑惑]
        [自信]

    `),
  modelName: Schema.string().description("模型名称").default("gpt-4o-mini"),
  maxGroupMessages: Schema.number()
    .description("群聊时允许的最长历史记录")
    .default(15),
  enableMemes: Schema.boolean()
    .description("是否启用表情包")
    .default(false)
    .description("若要启用此功能，请按github上的说明配置"),
  memesPath: Schema.string().description("表情包路径"),
  sleepTime: Schema.number()
    .default(1000)
    .description("每次发言后固定的间隔时间"),
  randomReply: Schema.number()
    .default(1)
    .description("随机回复概率，一个0-1之间小数"),
  messagesLength: Schema.number()
    .default(5)
    .description("每几条消息进行一次上报"),
  eachLetterCost: Schema.number()
    .default(480)
    .description("发言时每个字需要等待的时间"),
  memeCost: Schema.number()
    .default(600)
    .description("每次发送表情包需要的时间"),
  allowPrivateTalkingUsers: Schema.array(Schema.string()).description(
    "注意：目前仅支持单人，所以这里只填一个用户。允许私聊的用户列表"
  ),
  groups: Schema.array(Schema.string()).description("激活的群列表"),
  privateRefuse: Schema.string()
    .description("私聊拒绝回复")
    .default("主人不让我和陌生人说话"),
  singleAskSleep: Schema.number()
    .default(1000)
    .description("单次询问后等待时间"),
  singleTalkWaiting: Schema.number()
    .default(12000)
    .description("私聊时每过设置时间就检测有无新消息，看不懂就默认")
    .default(60000),
  singleClear: Schema.number()
    .description("私聊时每过设置时间若超过上限就清空历史")
    .default(30),
  singleMaxMessages: Schema.number()
    .description("私聊时历史消息上限")
    .default(40),
});

let receive = {};

const currentDate = new Date();

const formattedDateTime = currentDate.toLocaleString("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

let singleAsk = {};

let lastMessageTime = 0;

let historyMessages = {};

let messageCount = {};

let singleMessages = [];

let intervalId;

let intervalId2;

//程序开始
export function apply(ctx: Context, config: Config) {
  const memesPath = config.memesPath;
  const enableMemes = config.enableMemes;
  let tmp_random = {};
  let activeGroups = config.groups;
  //初始化
  for (let i = 0; i < activeGroups.length; i++) {
    historyMessages[activeGroups[i]] = [];
    messageCount[activeGroups[i]] = 0;
    receive[activeGroups[i]] = true;
    tmp_random[activeGroups[i]] = 0;
  }
  console.log(`${formattedDateTime} 激活的群列表:${activeGroups}`);
  //声明
  const messagesLength = config.messagesLength;
  const eachLetterCost = config.eachLetterCost;
  const random = config.randomReply;
  const sleepTime = config.sleepTime;
  const key = config.key;
  //读取prompt
  const prompt = config.prompt;
  const singlePrompt = config.singlePrompt;
  const apiGPT = new ApiGpt(ctx, {
    apiKey: key,
    model: config.modelName,
    reverseProxySwitch: config.enableProxy,
    reverseProxy: config.proxy,
  });

  console.log(`${formattedDateTime} 插件启动`);
  console.log(`${formattedDateTime} prompt:${prompt}`);

  //监听消息
  ctx.on("message", async (session) => {
    //提及回复
    //const regex = /^neko/i;
    if (
      (session.content.includes(config.nickName) ||
        session.content.includes(session.bot.selfId)) &&
      session.content.length < 30 &&
      session.isDirect == false
    ) {
      if (singleAsk[session.author.user.id] === undefined) {
        singleAsk[session.author.user.id] = true;
      }
      console.log(
        `${formattedDateTime} Bot在群聊${session.channelId}被${session.author.user.name}(${session.author.user.id})提及：${session.content}`
      );
      if (singleAsk[session.author.user.id] == false) {
        console.log(`${formattedDateTime} Bot拒绝回答，因为此人还在冷却期间`);
        return;
      }
      let tmp_return = await getAIReply(
        historyMessages[session.channelId],
        apiGPT,
        prompt
      );
      let reply = tmp_return["reply"];
      let emoji = tmp_return["emoji"];
      console.log(
        `${formattedDateTime} 群聊${
          session.channelId
        }取得回复:${reply.toString()}\nemoji:${emoji}`
      );
      singleAsk[session.author.user.id] = false;
      sendReply(session, reply, emoji, eachLetterCost, enableMemes, memesPath);
      historyMessages[session.channelId].push(
        SerializeMessage(config.nickName, tmp_return["origin"])
      );
      await sleep(config.singleAskSleep);
      singleAsk[session.author.user.id] = true;
      return;
    }
    //私聊处理
    if (session.isDirect) {
      console.log(`${formattedDateTime} 收到一条私聊消息 ${session.content}`);
      if (!config.allowPrivateTalkingUsers.includes(session.author.user.id)) {
        sleep(eachLetterCost * config.privateRefuse.length);
        session.send(config.privateRefuse);
        sleep(1000);
        if (enableMemes) {
          session.send(
            h.image(pathToFileURL(resolve(memesPath, `拒绝.png`)).href)
          );
        }
        return;
      } else {
        console.log(`${formattedDateTime} 检测新私聊消息 ${session.content}`);
        singleMessages.push(
          SerializeMessage(session.author.user.name, session.content)
        );
        lastMessageTime = Date.now();
        if (intervalId) {
          clearInterval(intervalId);
        }
        intervalId = setInterval(async () => {
          if (Date.now() - lastMessageTime > config.singleTalkWaiting) {
            console.log(
              `${config.singleTalkWaiting}ms内没有收到新消息，上报消息列表`
            );
            clearInterval(intervalId);
            let tmp_return = await getAIReply(
              singleMessages,
              apiGPT,
              singlePrompt
            );
            let reply = tmp_return["reply"];
            let emoji = tmp_return["emoji"];
            console.log(
              `${formattedDateTime} 私聊${session.userId}取得回复:${reply}\nemoji:${emoji}`
            );
            //将neko的回复添加至历史
            console.log(tmp_return["origin"]);
            singleMessages.push(
              SerializeMessage(config.nickName, tmp_return["origin"])
            );
            console.log(singleMessages);
            sendReply(
              session,
              reply,
              emoji,
              eachLetterCost,
              enableMemes,
              memesPath
            );
          }
        }, 7000);
        intervalId2 = setInterval(() => {
          if (Date.now() - lastMessageTime > config.singleClear) {
            console.log(`${config.singleClear}ms内没有收到新消息，清空上下文`);
            clearInterval(intervalId2);
            // 在这里处理没有新消息的情况
            if (singleMessages.length > config.singleMaxMessages) {
              singleMessages = [];
            }
          }
        }, config.singleClear);
      }
    }
    //检测队列及请求回复
    if (
      activeGroups.includes(session.channelId) &&
      receive[session.channelId] == true &&
      session.isDirect == false
    ) {
      //消息添加及上报
      if (messageCount[session.channelId] >= config.maxGroupMessages) {
        historyMessages[session.channelId].shift();
      }
      historyMessages[session.channelId].push(
        SerializeMessage(session.author.user.name, session.content)
      );
      messageCount[session.channelId]++;
      console.log(`${formattedDateTime} 群聊 ${
        session.channelId
      } 收到一条消息 ${session.content}
        \n目前群聊${session.channelId}队列${
        messageCount[session.channelId]
      }/${messagesLength}`);
      //发送请求
      if (messageCount[session.channelId] >= messagesLength) {
        tmp_random[session.channelId] = Math.random();
        messageCount[session.channelId] = 0;
        //请求
        if (tmp_random[session.channelId] < random) {
          console.log(`${formattedDateTime} 消息队列已满，发送请求`);
          receive[session.channelId] = false;
          let tmp_return = await getAIReply(
            historyMessages[session.channelId],
            apiGPT,
            prompt
          );
          let reply = tmp_return["reply"];
          let emoji = tmp_return["emoji"];
          console.log(
            `${formattedDateTime} 群聊${session.channelId}取得回复:${reply}\nemoji:${emoji}`
          );
          historyMessages[session.channelId].push(
            SerializeMessage(config.nickName, tmp_return["origin"])
          );
          sendReply(
            session,
            reply,
            emoji,
            eachLetterCost,
            enableMemes,
            memesPath
          );
          sleep(sleepTime);
          receive[session.channelId] = true;
        } else if (tmp_random[session.channelId] > random) {
          //随机不回复
          historyMessages[session.channelId] = [];
          console.log(`${formattedDateTime} 随机取数决定此次不回复`);
        }
      }
    }
  });

  //查看暂存消息列表
  ctx.command("LM").action((_) => {
    //historyMessages.pop()
    console.log(`${formattedDateTime} ${historyMessages.toString()}`);
    _.session.send("已输出至console");
  });
}

function SerializeMessage(username, content) {
  let message = `
    发送时间:${formattedDateTime}
    发送者:${username}
    发送内容:${content}
    `;
  return message;
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

  let result = str.replace(regex, "");

  return result;
}

async function getAIReply(messages: string[], gpt: ApiGpt, prompt) {
  let apiGPT = gpt;
  console.log(`${formattedDateTime} 向ai发送了请求${messages.toString()}`);
  const res = await apiGPT.ask(prompt + messages.toString(), "1");
  let content = res["text"];
  let origin = content;
  console.log(`${formattedDateTime} AI返回内容:${content}`);
  let emoji = GetEmoji(content);
  console.log(`${formattedDateTime} 表情:${emoji}`);
  content = content.replace(emoji, "");
  content = content.replace("[]", "");
  content = content.replace(emoji, "");
  content = content.replace("[]", "");
  //处理ai返回内容
  const symbols = "，。“”‘’,.！？''\"\""; // 定义分割符号
  const regex = new RegExp("[" + symbols + "]", "g");
  let reply: string[] = content.split(regex);
  return {
    reply: reply,
    emoji: emoji,
    origin: origin,
  };
}
async function sendReply(
  session,
  text,
  emoji,
  eachLetterCost,
  enableMemes,
  memesPath?
) {
  for (let i = 0; i < text.length; i++) {
    await sleep(eachLetterCost * text[i].length);
    session.send(text[i].replace('""', ""));
  }
  //发送表情
  if (emoji != null) {
    if (emoji == "万用") {
      emoji = emoji + randomInt(1, 3).toString();
    }
    await sleep(500);
    if (enableMemes) {
      session.send(
        console.log(
          `${formattedDateTime} 发送表情:${resolve(memesPath, `${emoji}.png`)}`
        ),
        session.send(
          h.image(pathToFileURL(resolve(memesPath, `${emoji}.png`)).href)
        )
      );
    }
  }
}
