/** 生成一个男女头像 */
export const randomUserAvatar = (gender: number) => {
  const genderMap = { 1: 'men', 2: 'women' };
  const genderKey = genderMap[gender as keyof typeof genderMap] || 'men';
  return `https://randomuser.me/api/portraits/${genderKey}/45.jpg`;
};
