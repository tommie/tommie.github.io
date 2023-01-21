'use strict';

import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.8, 4.7, 5.6, 6.8, 8.2];

function resistorRatio(Vout, Vref) {
    // a/(a+b)     = vr/vo = vratio
    // a           = vratio*(a+b)
    // a*(1-vratio) = b*vratio
    // a/b         = vratio/(1-vratio)
    const vratio = Vref / Vout;
    return vratio / (1 - vratio);
}

function magnitude10(ratio) {
    return Math.pow(10, Math.round(Math.log10(ratio)));
}

function normalizeRatio(ratio) {
    return ratio * Math.pow(10, -Math.floor(Math.log10(ratio)));
}

function findBestRatioPairs(targetRatio, series) {
    const normRatio = normalizeRatio(targetRatio);

    const targetMag = magnitude10(targetRatio);
    let aMag = targetMag, bMag = 1;
    if (targetMag < 1) {
        aMag = 1;
        bMag = 1 / targetMag;
    }

    const ratios = [];
    for (const a of series) {
        const aa = a * aMag;
        for (const b of series) {
            const bb = b * bMag;
            const r = normalizeRatio(aa / (aa + bb));
            ratios.push([aa, bb, Math.log(r / normRatio)]);
        }
    }
    ratios.sort((a, b) => Math.abs(a[2]) - Math.abs(b[2]));
    return ratios;
}

function matchImpedance(targetImpedance, pairs) {
    const targetMag = magnitude10(targetImpedance);

    const output = [];
    for (let [a, b, ratioLogLoss] of pairs) {
        const mag = magnitude10(a + b);
        a *= targetMag / mag;
        b *= targetMag / mag;

        const loss = (a + b) / targetImpedance;
        output.push([a, b, Math.exp(ratioLogLoss) - 1, loss - 1]);
    }
    return output;
}

function selectResistors(Vout, Vref, Rtot, frac, series) {
    if (Math.abs(Vout - Vref) < 1e-6) {
        return [[0, Infinity, Vout / Vref - 1, 0]];
    }
    const ratio = Vref / Vout;
    let pairs = findBestRatioPairs(ratio, E12);
    pairs = pairs.slice(0, Math.ceil(pairs.length * frac));
    pairs = matchImpedance(Rtot, pairs);
    return pairs;
}

createApp({
    data() {
        return {
            vout: 3.3,
            vref: 2.5,
            rtot: 10,
        };
    },
    computed: {
        resistors() {
            return selectResistors(this.vout, this.vref, this.rtot, 0.1, E12);
        },
    },
}).mount('#psuApp');
