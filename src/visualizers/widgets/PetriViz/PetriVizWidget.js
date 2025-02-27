/*globals define, WebGMEGlobal*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Tue Dec 07 2021 23:13:50 GMT+0000 (Coordinated Universal Time).
 */

define(['jointjs','css!./styles/PetriVizWidget.css'], function (joint) {
    'use strict';

    var WIDGET_CLASS = 'petri-viz';

    function PetriVizWidget(logger, container) {
        this._logger = logger.fork('Widget');

        this._el = container;
        this.nodes = {};
        this._initialize();

        this._logger.debug('ctor finished');
    }

    PetriVizWidget.prototype._initialize = function () {
        var width = this._el.width(),
            height = this._el.height(),
            self = this;
        // set widget class
        this._el.addClass(WIDGET_CLASS);
        this._jointPetri = new joint.dia.Graph;
        this._jointPaper = new joint.dia.Paper({
            el: this._el,
            width : width,
            height: height,
            model: this._jointPetri,
            interactive: true
        });
        // add event calls to elements
        this._jointPaper.on('element:pointerdblclick', function(elementView) {
            const currentElement = elementView.model;
            if (self._webgmePetri){
                if (self._webgmePetri.id2transtions[currentElement.id] in self._webgmePetri.fireableTrans) {
                    self._setState(self._webgmePetri.id2transtions[currentElement.id]);
                }
            }
        });
        this._webgmePetri = null;
    };

    PetriVizWidget.prototype.onWidgetContainerResize = function (width, height) {
        this._logger.debug('Widget is resizing...');
    };

    // Adding/Removing/Updating items
    PetriVizWidget.prototype.addNode = function (desc) {
        if (desc) {
            // Add node to a table of nodes
            var node = document.createElement('div'),
                label = 'children';

            if (desc.childrenIds.length === 1) {
                label = 'child';
            }

            this.nodes[desc.id] = desc;
            node.innerHTML = 'Adding node "' + desc.name + '" (click to view). It has ' +
                desc.childrenIds.length + ' ' + label + '.';

            this._el.append(node);
            node.onclick = this.onNodeClick.bind(this, desc.id);
        }
    };

    PetriVizWidget.prototype.removeNode = function (gmeId) {
        var desc = this.nodes[gmeId];
        this._el.append('<div>Removing node "' + desc.name + '"</div>');
        delete this.nodes[gmeId];
    };

    PetriVizWidget.prototype.updateNode = function (desc) {
        if (desc) {
            this._logger.debug('Updating node:', desc);
            this._el.append('<div>Updating node "' + desc.name + '"</div>');
        }
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */

    // PetriVizWidget.prototype.onNodeClick = function (/*id*/) {
    //     // This currently changes the active node to the given id and
    //     // this is overridden in the controller.
    // };

    // PetriVizWidget.prototype.onBackgroundDblClick = function () {
    //     this._el.append('<div>Background was double-clicked!!</div>');
    // };

    // State Machine manipulating functions called from the controller
    PetriVizWidget.prototype.initPetri = function (petriDescriptor) {
        const self = this;
        self._webgmePetri = petriDescriptor;
        self._jointPetri.clear();
        const petri = self._webgmePetri;
        petri.id2place = {};
        petri.id2transtions = {};

        // first add the places
        Object.keys(petri.places).forEach(placeId => {
            let vertex = null;
            vertex = new joint.shapes.standard.Circle({
                position: petri.places[placeId].position,
                size: { width: 60, height: 60 },
                attrs: {
                    label : {
                        text: petri.places[placeId].tokens,
                        //event: 'element:label:pointerdown',
                        fontWeight: 'bold',
                        cursor: 'text',
                        //style: {
                        //    userSelect: 'text'
                        //}
                    },
                    body: {
                        strokeWidth: 2,
                        cursor: 'pointer'
                    }
                },
            tokens: petri.places[placeId].tokens
            });
            vertex.addTo(self._jointPetri);
            petri.places[placeId].joint = vertex;
            petri.id2place[vertex.id] = placeId;
        });

        //second add the transtions
        Object.keys(petri.transitions).forEach(transId => {
            let vertex = null;
            vertex = new joint.shapes.standard.Rectangle({
                position: petri.transitions[transId].position,
                size: { width: 20, height: 60 },
                attrs: {
                    label : {
                        // text: petri.transitions[transId].name,
                        //event: 'element:label:pointerdown',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        //style: {
                        //    userSelect: 'text'
                        //}
                    },
                    body: {
                        strokeWidth: 2,
                        cursor: 'pointer'
                    }
                }
            });
            vertex.addTo(self._jointPetri);
            petri.transitions[transId].joint = vertex;
            petri.id2transtions[vertex.id] = transId;
        });

        // then create the links place to transtion
        Object.keys(petri.places).forEach(placeId => {
            Object.values(petri.places[placeId].transitions).forEach(transId => {
                console.log(petri.places[placeId]);
                petri.places[placeId].jointArc = petri.places[placeId].jointArc || {};
                const link = new joint.shapes.standard.Link({
                    source: {id: petri.places[placeId].joint.id},
                    target: {id: petri.transitions[petri.places[placeId].transitions[transId]].joint.id},
                    attrs: {
                        line: {
                            strokeWidth: 2
                        },
                        wrapper: {
                            cursor: 'default'
                        }
                    },
                    labels: [{
                        position: {
                            distance: 0.5,
                            offset: 0,
                            args: {
                                keepGradient: true,
                                ensureLegibility: true
                            }
                        },
                        attrs: {
                            text: {
                                fontWeight: 'bold'
                            }
                        }
                    }]
                });
                link.addTo(self._jointPetri);
                petri.places[placeId].jointArc[transId] = link;
            })
        });

        // then create the links transition to place
        Object.keys(petri.transitions).forEach(transId => {
            Object.values(petri.transitions[transId].places).forEach(placeId => {
                petri.transitions[transId].jointArc = petri.transitions[transId].jointArc || {};
                const link = new joint.shapes.standard.Link({
                    source: {id: petri.transitions[transId].joint.id},
                    target: {id: petri.places[petri.transitions[transId].places[placeId]].joint.id},
                    attrs: {
                        line: {
                            strokeWidth: 2
                        },
                        wrapper: {
                            cursor: 'default'
                        }
                    },
                    labels: [{
                        position: {
                            distance: 0.5,
                            offset: 0,
                            args: {
                                keepGradient: true,
                                ensureLegibility: true
                            }
                        },
                        attrs: {
                            text: {
                                fontWeight: 'bold'
                            }
                        }
                    }]
                });
                link.addTo(self._jointPetri);
                petri.transitions[transId].jointArc[placeId] = link;
            })
        });

        //now refresh the visualization
        self._jointPaper.updateViews();
        self._decorateMachine();
        if (Object.keys(petri.fireableTrans).length == 0){
            alert('Network is Deadlocked!');
        }
    };

    PetriVizWidget.prototype.destroyMachine = function () {

    };

    // PetriVizWidget.prototype.fireEvent = function (transId) {
    //     const petri = this._webgmePetri
    //     Object.keys(petri.transitions[transId].places).forEach(placeId => {
    //         const link = petri.transtions[transId].jointArc[placeId];
    //         const linkView = link.findView(self._jointPaper);
    //         linkView.sendToken(joint.V('circle', { r: 10, fill: 'black' }), {duration:1000}, function() {
    //             // this.initPetri();
    //             // this._decorateMachine();
    //         });
    //     });
    // };

    PetriVizWidget.prototype.fireTokens = function (places) {
        const petri = this._webgmePetri
        Object.keys(places.inplaces).forEach(placeId => {
            const link = petri.places[placeId].jointArc[places.fired];
            console.log(places);
            const linkView = link.findView(this._jointPaper);
            linkView.sendToken(joint.V('circle', { r: 5, fill: 'black' }), {duration:500});
        });
        Object.keys(places.outplaces).forEach(placeId => {
            const link = petri.transitions[places.fired].jointArc[placeId];
            const linkView = link.findView(this._jointPaper);
            linkView.sendToken(joint.V('circle', { r: 5, fill: 'black' }), {duration:500});
        });
    };

    PetriVizWidget.prototype.fireAllTokens = function (petriMap) {
        const petri = this._webgmePetri
        Object.keys(petriMap.t2p).forEach(transId => {
            Object.keys(petriMap.t2p[transId]).forEach( placeId => {
                const link = petri.transitions[transId].jointArc[placeId];
                const linkView = link.findView(this._jointPaper);
                linkView.sendToken(joint.V('circle', { r: 5, fill: 'black' }), {duration:500});
            });
        });
        Object.keys(petriMap.p2t).forEach(placeId => {
            Object.keys(petriMap.p2t[placeId]).forEach( transId => {
                const link = petri.places[placeId].jointArc[transId];
                const linkView = link.findView(this._jointPaper);
                linkView.sendToken(joint.V('circle', { r: 5, fill: 'black' }), {duration:500});
            });
        });
    };

    PetriVizWidget.prototype._decorateMachine = function() {
        const petri = this._webgmePetri;
        Object.keys(petri.places).forEach(placeId => {
            petri.places[placeId].joint.attr('label/text', petri.places[placeId].tokens);
        });
        Object.keys(petri.transitions).forEach(transId => {
            petri.transitions[transId].joint.attr('body/fill', 'white');
        });
        Object.keys(petri.fireableTrans).forEach(transId => {
            petri.transitions[transId].joint.attr('body/fill', 'black');
        });
    };

    PetriVizWidget.prototype._setState = function(firedTrans) {
        const petri = this._webgmePetri;
        const places = { inplaces:{}, outplaces:{}, fired: firedTrans }
        const fireables = {};
        //decremetn places
        Object.keys(petri.places).forEach( placeId => {
            Object.values(petri.places[placeId].transitions).forEach(transId => {
                if (transId === firedTrans){
                    petri.places[placeId].tokens -= 1;
                    places.inplaces[placeId] = placeId;
                }
            });
        });

        //increment places
        Object.values(petri.transitions[firedTrans].places).forEach(placeId => {
            petri.places[placeId].tokens += 1;
            places.outplaces[placeId] = placeId;
        });

        //determine fireability of transitions
        Object.keys(petri.transitions).forEach( transId => {
            petri.transitions[transId].fireable = true;
        });
        Object.keys(petri.places).forEach( placeId => {
            Object.keys(petri.places[placeId].transitions).forEach( transId => {
                fireables[transId] = transId;
            });
        });
        Object.keys(petri.transitions).forEach( transId => {
            if (!(transId in fireables)){
                petri.transitions[transId].fireable = false;
            }
        });
        Object.keys(petri.places).forEach( placeId => {
            if (petri.places[placeId].tokens <= 0){
                Object.values(petri.places[placeId].transitions).forEach( transId => {
                    petri.transitions[transId].fireable = false;
                });
            }
        });
        petri.fireableTrans = {};
        Object.keys(petri.transitions).forEach( transId => {
            if (petri.transitions[transId].fireable == true){
                petri.fireableTrans[transId] = transId;
            }
        });

        this.fireTokens(places);
        this._decorateMachine();
        if (Object.keys(petri.fireableTrans).length == 0){
            alert('Network is Deadlocked!');
        }
    };

    PetriVizWidget.prototype._setAllStates = function () {
        const petri = this._webgmePetri;
        const petriMap = { p2t:{}, t2p:{} };
        const fireables = {};
        //decremetn places
        Object.keys(petri.places).forEach( placeId => {
            Object.values(petri.places[placeId].transitions).forEach(transId => {
                if (petri.transitions[transId].fireable == true){
                    petri.places[placeId].tokens -= 1;
                    petriMap.p2t[placeId] = petri.places[placeId].transitions;
                }
            });
        });

        //increment places
        Object.keys(petri.fireableTrans).forEach( transId => {
                Object.values(petri.transitions[transId].places).forEach( placeId => {
                    petri.places[placeId].tokens += 1;
                    petriMap.t2p[transId] = petri.transitions[transId].places;
                });
        });

        //determine fireability of transitions
        Object.keys(petri.transitions).forEach( transId => {
            petri.transitions[transId].fireable = true;
        });
        Object.keys(petri.places).forEach( placeId => {
            Object.keys(petri.places[placeId].transitions).forEach( transId => {
                fireables[transId] = transId;
            });
        });
        Object.keys(petri.transitions).forEach( transId => {
            if (!(transId in fireables)){
                petri.transitions[transId].fireable = false;
            }
        });
        Object.keys(petri.places).forEach( placeId => {
            if (petri.places[placeId].tokens <= 0){
                Object.values(petri.places[placeId].transitions).forEach( transId => {
                    petri.transitions[transId].fireable = false;
                });
            }
        });
        petri.fireableTrans = {};
        Object.keys(petri.transitions).forEach( transId => {
            if (petri.transitions[transId].fireable == true){
                petri.fireableTrans[transId] = transId;
            }
        });

        this.fireAllTokens(petriMap);
        this._decorateMachine();
        if (Object.keys(petri.fireableTrans).length == 0){
            alert('Network is Deadlocked!');
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    PetriVizWidget.prototype.destroy = function () {
    };

    PetriVizWidget.prototype.onActivate = function () {
        this._logger.debug('PetriVizWidget has been activated');
    };

    PetriVizWidget.prototype.onDeactivate = function () {
        this._logger.debug('PetriVizWidget has been deactivated');
    };

    return PetriVizWidget;
});
