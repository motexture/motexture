import { cellColors } from './four.full.module.js';
import { MeshPhongMaterial, NormalBlending, DoubleSide, LineBasicMaterial, AdditiveBlending } from './three.module.js';

const defaultColors = new Array(128).fill().map(() => 'hsl(163, 97%, 32%)');

export default {
    faces: {
        enabled: true,
        useColors: true,
        colorGenerator: cellColors,
        colors: defaultColors,
        reuse: 'none',
        split: 'cells',
        splitScale: 100,
        material: new MeshPhongMaterial({
            transparent: true,
            opacity: 0.1,
            blending: NormalBlending,
            depthWrite: false,
            side: DoubleSide,
            vertexColors: true,
        }),
    },
    edges: {
        enabled: true,
        useColors: true,
        colorGenerator: cellColors,
        colors: defaultColors,
        reuse: 'faces',
        split: 'cells',
        splitScale: 100,
        material: new LineBasicMaterial({
            transparent: true,
            opacity: 0.1,
            blending: AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
            linewidth: 2,
        }),
    },
}