/**
 * Shape Wars - Static Image Assets Registry
 * Uses Vite ES module imports so assets are guaranteed to resolve correctly
 * in both development and production builds.
 */

import pulsarAvatar from './images/hero_pulsar_portrait_1791566427575.jpg';
import voltAvatar from './images/hero_volt_portrait_1791566440706.jpg';
import bastionAvatar from './images/hero_bastion_portrait_1791566451816.jpg';
import novaAvatar from './images/hero_nova_portrait_1791566461364.jpg';
import prismaAvatar from './images/hero_prisma_portrait_1791572925320.jpg';
import boomAvatar from './images/hero_boom_portrait_1791572941838.jpg';
import eclipseAvatar from './images/hero_eclipse_portrait_1791572961839.jpg';
import cometaAvatar from './images/hero_cometa_portrait_1791572980833.jpg';
import titanAvatar from './images/hero_titan_portrait_1791572997975.jpg';
import vortexAvatar from './images/hero_vortex_portrait_1791573029213.jpg';

import pixelFloorImg from './images/pixel_arena_floor_1791571600056.jpg';
import pixelWallImg from './images/pixel_wall_block_1791571560112.jpg';
import pixelPillarImg from './images/pixel_pillar_block_1791571572168.jpg';
import pixelBushImg from './images/pixel_bush_leaves_1791571584940.jpg';

export const HERO_AVATARS: Record<string, string> = {
  pulsar: pulsarAvatar,
  volt: voltAvatar,
  bastion: bastionAvatar,
  nova: novaAvatar,
  prisma: prismaAvatar,
  boom: boomAvatar,
  eclipse: eclipseAvatar,
  cometa: cometaAvatar,
  titan: titanAvatar,
  vortex: vortexAvatar,
};

export const ARENA_TEXTURES = {
  floor: pixelFloorImg,
  wall: pixelWallImg,
  pillar: pixelPillarImg,
  bush: pixelBushImg,
};
