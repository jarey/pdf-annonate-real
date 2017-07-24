import PDFJSAnnotate from '../PDFJSAnnotate';
import config from '../config';
import {
    appendChild
} from '../render/appendChild';
import {
    findSVGAtPoint,
    getMetadata,
    convertToSvgPoint
} from './utils';

let _enabled = false;
let _type;
let _circleRadius = 10;
let _circleColor = '0000FF';

/**
 * Set the attributes of the pen.
 *
 * @param {Number} circleRadius The radius of the circle
 * @param {String} circleColor The color of the circle
 */
export function setCircle(circleRadius = 10, circleColor = '0000FF') {
    _circleRadius = parseInt(circleRadius, 10);
    _circleColor = circleColor;
}

/**
 * Handle document.mouseup event
 *
 * @param {Event} e The DOM event to handle
 */
function handleDocumentMouseup(e) {

    //added by us code
    if (e.target.nodeName == "BUTTON") {
        return;
    }
    //added by us code

    let svg = findSVGAtPoint(e.clientX, e.clientY);
    if (!svg) {
        return;
    }
    let rect = svg.getBoundingClientRect();
    saveCircle(svg, _type, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    }, _circleRadius, _circleColor);
}

/**
 * Save a circle annotation
 *
 * @param {String} type The type of circle (circle, emptycircle, fillcircle)
 * @param {Object} pt The point to use for annotation
 * @param {String} color The color of the rects
 */
function saveCircle(svg, type, pt, radius, color) {
    // Initialize the annotation    
    
    

    let svg_pt = convertToSvgPoint([pt.x, pt.y], svg)    
    let annotation = {
        type,
        color,
        cx: svg_pt[0],
        cy: svg_pt[1],
        r: radius
    };

    let {
        documentId,
        pageNumber
    } = getMetadata(svg);

    // Add the annotation
    PDFJSAnnotate.getStoreAdapter().addAnnotation(documentId, pageNumber, annotation)
        .then((annotation) => {
            appendChild(svg, annotation);
        });
}

/**
 * Enable circle behavior
 */
export function enableCircle(type) {

    $('#content-wrapper').css('overflow-y', 'hidden');
    $('#content-wrapper').css('overflow-x', 'hidden');
    $('#content-wrapper').css('-webkit-overflow-scrolling', 'none');


    _type = type;

    if (_enabled) {
        return;
    }

    _enabled = true;
    document.addEventListener('mouseup', handleDocumentMouseup);
}

/**
 * Disable circle behavior
 */
export function disableCircle() {

    $('#content-wrapper').css('overflow-y', 'scroll');
    $('#content-wrapper').css('overflow-x', 'scroll');
    $('#content-wrapper').css('-webkit-overflow-scrolling', 'touch');

    if (!_enabled) {
        return;
    }

    _enabled = false;
    document.removeEventListener('mouseup', handleDocumentMouseup);
}