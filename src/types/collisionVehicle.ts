import { Vehicle, NavMesh } from 'yuka';

export class CollisionVehicle extends Vehicle {
  navMesh: NavMesh;

  constructor(navMesh: NavMesh) {
    super();
    this.navMesh = navMesh;
  }

  update(delta: number): this {
    super.update(delta);
    const currentRegion = this.navMesh.getRegionForPoint(this.position, 10);

    if (currentRegion !== null) {
      const distance = currentRegion.distanceToPoint(this.position);
      this.position.y -= distance * 0.2;
    }

    return this;
  }
}
