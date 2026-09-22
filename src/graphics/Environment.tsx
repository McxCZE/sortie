import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export default function Environment() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl),
      room = new RoomEnvironment(),
      map = generator.fromScene(room, 0.04);
    // oxlint-disable-next-line react/immutability -- Three.js owns this mutable scene, outside React state.
    scene.environment = map.texture;
    invalidate();
    return () => {
      scene.environment = null;
      map.dispose();
      room.dispose();
      generator.dispose();
    };
  }, [gl, scene, invalidate]);
  return null;
}
