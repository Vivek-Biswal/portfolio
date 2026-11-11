import {Vector3} from 'three';

const areas={
 projects:{target:[-4.6,1.25,-3.8],offset:[3.5,4.7,7]},
 notes:{target:[-5.6,.9,1],offset:[4.2,4.7,7]},
 arcade:{target:[4.5,1.15,-1.3],offset:[-6,6.5,10]},
 contact:{target:[4.75,.9,3.65],offset:[3,4.5,6.5]},
};
export function roomFocusPose(area){
 const preset=areas[area];if(!preset)return null;
 const target=new Vector3(...preset.target);return {target,position:target.clone().add(new Vector3(...preset.offset))};
}
export function configureRoomCamera(controls){
 controls.enablePan=true;controls.screenSpacePanning=true;controls.zoomToCursor=true;
 controls.minDistance=3;controls.maxDistance=34;
}
