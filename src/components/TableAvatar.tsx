import { AvatarPhoto } from './AvatarPhoto';
import React from 'react';
import { Image, View } from 'react-native';
import { isTableAvatarId } from '../../shared/tableAvatars';
export const tableAvatarImages = [
  require('../../assets/table-avatars/01-family.png'),
  require('../../assets/table-avatars/02-friends.png'),
  require('../../assets/table-avatars/03-cousins.png'),
  require('../../assets/table-avatars/04-couple.png'),
  require('../../assets/table-avatars/05-grandparents.png'),
  require('../../assets/table-avatars/06-sisters.png'),
  require('../../assets/table-avatars/07-brothers.png'),
  require('../../assets/table-avatars/08-colleagues.png'),
  require('../../assets/table-avatars/09-neighbours.png'),
  require('../../assets/table-avatars/10-college.png'),
  require('../../assets/table-avatars/11-reunion.png'),
  require('../../assets/table-avatars/12-birthday.png'),
  require('../../assets/table-avatars/13-festival.png'),
  require('../../assets/table-avatars/14-weekend.png'),
  require('../../assets/table-avatars/15-champions.png'),
  require('../../assets/table-avatars/16-music.png'),
  require('../../assets/table-avatars/17-cricket.png'),
  require('../../assets/table-avatars/18-book-club.png'),
  require('../../assets/table-avatars/19-travel.png'),
  require('../../assets/table-avatars/20-tea-club.png'),
] as const;
export const TableAvatar = React.memo(function TableAvatar({ id, photo, size = 48 }: { id?: number; photo?: string; size?: number }) {
  return <View style={{ width: size, height: size }}><Image accessible={false} source={tableAvatarImages[isTableAvatarId(id) ? id : 0]} fadeDuration={0} resizeMode="cover" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#31065b' }} /><AvatarPhoto photo={photo} size={size} /></View>;
});
