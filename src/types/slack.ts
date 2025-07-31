import { SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  profile: {
    email?: string;
    display_name: string;
    real_name: string;
    image_72: string;
  };
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
}

export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  files?: SlackFile[];
  blocks?: any[];
}

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  url_private: string;
  url_private_download: string;
  thumb_360?: string;
  thumb_480?: string;
  thumb_720?: string;
  thumb_1024?: string;
  original_h?: number;
  original_w?: number;
}

export interface SlackThreadMessage {
  user: string;
  text: string;
  ts: string;
  files?: SlackFile[];
  thread_ts: string;
}

export interface StarshipMentionContext {
  channel: string;
  user: string;
  text: string;
  thread_ts?: string;
  messages: SlackThreadMessage[];
  files: SlackFile[];
  assignTo?: string;
}

export type SlackBoltEvent = SlackEventMiddlewareArgs<'app_mention'> & AllMiddlewareArgs;
