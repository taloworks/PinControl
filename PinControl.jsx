/*
 * PinControl 1.3.0
 * Creates shape layer controllers for puppet pins and shape path points in Adobe After Effects.
 * https://github.com/taloworks/PinControl
 *
 * Copyright (c) 2025-2026 taloworks
 * Released under the MIT License. See LICENSE for details.
 */

(function(ctx) {
    var SETTINGS_SECTION = "PinControl";

    var config = {
        targetType: "puppet",
        pinTarget: "selected",
        controlSize: 75,
        visualColor: [1, 0, 0, 1],
        labelColor: 1,
        visualAlpha: 0.75,
        shapeType: "circle",
        parentingMode: "none"
    };

    // Controller colors, in the same order as translations "colors"
    // label = AE label color index: 0=None, 1=Red, 2=Yellow, 3=Aqua, 4=Pink, 5=Lavender, 6=Peach, 7=Seafoam,
    // 8=Blue, 9=Green, 10=Purple, 11=Orange, 12=Brown, 13=Fuchsia Pink, 14=Cyan, 15=Sandstone, 16=Dark Green
    var COLORS = [
        { rgb: [1, 0, 0], label: 1 },       // Red
        { rgb: [0, 0, 1], label: 8 },       // Blue
        { rgb: [0, 1, 0], label: 9 },       // Green
        { rgb: [1, 1, 0], label: 2 },       // Yellow
        { rgb: [1, 0, 1], label: 10 },      // Purple
        { rgb: [0, 1, 1], label: 14 },      // Cyan
        { rgb: [1, 0.65, 0], label: 11 },   // Orange
        { rgb: [1, 0.41, 0.71], label: 4 }  // Pink
    ];

    // Controller shapes, in the same order as translations "shapes"
    var SHAPES = ["circle", "square"];

    var PUPPET_PIN_MATCH_NAMES = {
        "ADBE FreePin3 PosPin Atom": true,
        "ADBE FreePin3 AdvancedPin Atom": true,
        "ADBE FreePin3 BendPin Atom": true
    };

    function getUILanguage() {
        var lang = "en";

        try {
            if (app.language === Language.JAPANESE) {
                lang = "ja";
            }
        } catch (e) {
            lang = "en";
        }

        return lang;
    }

    // "%s" in messages is replaced by formatMessage()
    var translations = {
        "en": {
            "title": "PinControl",
            "targetType": "Target Type",
            "puppetPins": "Puppet Pins",
            "pathPoints": "Path Points",
            "targetScope": "Scope",
            "scopeSelected": "Selected Only",
            "scopeAll": "All",
            "controllerSettings": "Controller Settings",
            "size": "Size:",
            "color": "Color:",
            "colors": ["Red", "Blue", "Green", "Yellow", "Purple", "Cyan", "Orange", "Pink"],
            "shape": "Shape:",
            "shapes": ["Circle", "Square"],
            "parentingMode": "Parenting",
            "create": "Create",
            "undoPuppet": "Create Puppet Pin Controllers",
            "undoPath": "Create Path Point Controllers",
            "errors": {
                "noComp": "Open a composition first.",
                "noLayer": "Select a layer first.",
                "noPins": "%s has no puppet pins.",
                "noPathPoints": "%s has no path points.",
                "notShapeLayer": "%s is not a shape layer. Path Points mode works on shape layers only.",
                "noSelectedPins": "No puppet pins are selected. Select pins in the Effect Controls panel, or choose All.",
                "noSelectedPaths": "No paths are selected in %s. Select paths (or shape groups) in the Timeline, or choose All.",
                "noProcessedPins": "No puppet pins were linked.",
                "noProcessedPathPoints": "No path points were linked.",
                "pinFailed": "Failed to link pin #%s: ",
                "pathPointFailed": "Failed to link path point #%s: ",
                "controlEffectsFailed": "Failed to add controller effects: ",
                "expressionFailed": "Failed to set expressions: "
            },
            "success": {
                "pinsLinked": " puppet pins linked to controllers.",
                "pathPointsLinked": " path points linked to controllers."
            }
        },
        "ja": {
            "title": "PinControl",
            "targetType": "対象タイプ",
            "puppetPins": "パペットピン",
            "pathPoints": "パスのポイント",
            "targetScope": "対象範囲",
            "scopeSelected": "選択のみ",
            "scopeAll": "すべて",
            "controllerSettings": "コントローラー設定",
            "size": "サイズ:",
            "color": "カラー:",
            "colors": ["赤", "青", "緑", "黄", "紫", "シアン", "オレンジ", "ピンク"],
            "shape": "形:",
            "shapes": ["丸", "四角"],
            "parentingMode": "親子付け",
            "create": "作成",
            "undoPuppet": "パペットピンコントローラー作成",
            "undoPath": "パスのポイントコントローラー作成",
            "errors": {
                "noComp": "コンポジションを開いてください。",
                "noLayer": "レイヤーを選択してください。",
                "noPins": "%s にはパペットピンがありません。",
                "noPathPoints": "%s にはパスのポイントがありません。",
                "notShapeLayer": "%s はシェイプレイヤーではありません。パスのポイントはシェイプレイヤーでのみ使用できます。",
                "noSelectedPins": "パペットピンが選択されていません。エフェクトコントロールパネルでピンを選択するか、「すべて」を選んでください。",
                "noSelectedPaths": "%s で選択されているパスがありません。タイムラインでパス（またはシェイプグループ）を選択するか、「すべて」を選んでください。",
                "noProcessedPins": "リンクされたパペットピンはありません。",
                "noProcessedPathPoints": "リンクされたパスのポイントはありません。",
                "pinFailed": "ピン #%s のリンクに失敗しました: ",
                "pathPointFailed": "パスのポイント #%s のリンクに失敗しました: ",
                "controlEffectsFailed": "コントローラーのエフェクト追加に失敗しました: ",
                "expressionFailed": "エクスプレッションの設定に失敗しました: "
            },
            "success": {
                "pinsLinked": "個のパペットピンにコントローラーをリンクしました。",
                "pathPointsLinked": "個のパスのポイントにコントローラーをリンクしました。"
            }
        }
    };

    var txt = translations[getUILanguage()];

    // Replace "%s" in a message with a value (split/join avoids "$" patterns in layer names)
    function formatMessage(template, value) {
        return template.split("%s").join(value);
    }

    // Persist UI settings between sessions. A failure here only means defaults are used next time.
    function loadSetting(key, defaultValue) {
        try {
            if (app.settings.haveSetting(SETTINGS_SECTION, key)) {
                return app.settings.getSetting(SETTINGS_SECTION, key);
            }
        } catch (e) { /* use default */ }
        return defaultValue;
    }

    function saveSetting(key, value) {
        try {
            app.settings.saveSetting(SETTINGS_SECTION, key, String(value));
        } catch (e) { /* not critical */ }
    }

    // Parse a saved integer, falling back to defaultValue when missing or outside [min, max]
    function toInt(value, min, max, defaultValue) {
        var n = parseInt(value, 10);
        return (isNaN(n) || n < min || n > max) ? defaultValue : n;
    }

    function createInterface(ctx) {
        var panel = (ctx instanceof Panel) ? ctx : new Window("palette", txt.title);
        panel.orientation = "column";
        panel.spacing = 6;
        panel.margins = 10;
        panel.alignChildren = ["fill", "top"]; // keep everything at the top when the panel is resized

        // Row 1: target type / scope
        var targetRow = panel.add("group");
        targetRow.orientation = "row";
        targetRow.alignChildren = ["left", "fill"];
        targetRow.spacing = 6;
        targetRow.margins = 0;

        var targetTypeGroup = targetRow.add("panel", undefined, txt.targetType);
        targetTypeGroup.orientation = "row";
        targetTypeGroup.alignChildren = ["left", "center"];
        targetTypeGroup.spacing = 10;
        targetTypeGroup.margins = [10, 12, 10, 8];

        var puppetOption = targetTypeGroup.add("radiobutton", undefined, txt.puppetPins);
        var pathPointsOption = targetTypeGroup.add("radiobutton", undefined, txt.pathPoints);

        var scopeGroup = targetRow.add("panel", undefined, txt.targetScope);
        scopeGroup.orientation = "row";
        scopeGroup.alignChildren = ["left", "center"];
        scopeGroup.alignment = ["fill", "fill"];
        scopeGroup.spacing = 10;
        scopeGroup.margins = [10, 12, 10, 8];

        var selectedOption = scopeGroup.add("radiobutton", undefined, txt.scopeSelected);
        var allOption = scopeGroup.add("radiobutton", undefined, txt.scopeAll);

        // Row 2: controller settings
        var visualPanel = panel.add("panel", undefined, txt.controllerSettings);
        visualPanel.orientation = "column";
        visualPanel.alignChildren = ["left", "top"];
        visualPanel.spacing = 10;
        visualPanel.margins = [10, 14, 10, 10];

        // Laid out as a 2-column grid: labels are right-aligned so the colons line up, the first field
        // has a fixed width, and Parenting is indented to line up with the Color dropdown.
        var LABEL_WIDTH = 34;        // fits the longest first-column label ("Shape:")
        var COLOR_LABEL_WIDTH = 30;  // fits "Color:"
        var FIELD_SPACING = 4;       // gap between a label and its control
        var DROPDOWN_WIDTH = 72;     // narrowest width that shows the longest item ("オレンジ") without clipping
        var SLIDER_WIDTH = 65;
        var VALUE_WIDTH = 22;        // fits "100"
        var FIRST_FIELD_WIDTH = LABEL_WIDTH + FIELD_SPACING + SLIDER_WIDTH + FIELD_SPACING + VALUE_WIDTH;

        function addRow(parent) {
            var row = parent.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.spacing = 12;
            row.margins = 0;
            return row;
        }

        function addField(row, width) {
            var field = row.add("group");
            field.orientation = "row";
            field.alignChildren = ["left", "center"];
            field.spacing = FIELD_SPACING;
            field.margins = 0;
            if (width) {
                field.minimumSize.width = width; // preferredSize is ignored for groups by the layout manager
            }
            return field;
        }

        function addLabel(field, text, width) {
            var label = field.add("statictext", undefined, text);
            label.justify = "right";
            label.preferredSize.width = width;
            return label;
        }

        var styleRow = addRow(visualPanel);

        var shapeField = addField(styleRow, FIRST_FIELD_WIDTH);
        addLabel(shapeField, txt.shape, LABEL_WIDTH);
        var shapeList = shapeField.add("dropdownlist", undefined, txt.shapes);
        shapeList.preferredSize.width = DROPDOWN_WIDTH;

        var colorField = addField(styleRow);
        addLabel(colorField, txt.color, COLOR_LABEL_WIDTH);
        var colorList = colorField.add("dropdownlist", undefined, txt.colors);
        colorList.preferredSize.width = DROPDOWN_WIDTH;
        var colorSwatch = colorField.add("panel");
        colorSwatch.preferredSize = [20, 20];

        var sizeRow = addRow(visualPanel);

        var sizeField = addField(sizeRow, FIRST_FIELD_WIDTH);
        addLabel(sizeField, txt.size, LABEL_WIDTH);
        var sizeSlider = sizeField.add("slider", undefined, 50, 0, 100);
        sizeSlider.preferredSize.width = SLIDER_WIDTH;
        var sizeValue = sizeField.add("statictext", undefined, "50");
        sizeValue.preferredSize.width = VALUE_WIDTH;

        var parentingField = addField(sizeRow);
        parentingField.margins = [COLOR_LABEL_WIDTH + FIELD_SPACING, 0, 0, 0]; // line up with the Color dropdown
        var parentingCheckbox = parentingField.add("checkbox", undefined, txt.parentingMode);

        // Row 3: create. Added to the panel directly: a zero-margin group would clip the focus ring.
        var generateBtn = panel.add("button", undefined, txt.create);
        generateBtn.preferredSize.height = 30;

        function setSwatchColor(rgb) {
            colorSwatch.graphics.backgroundColor = colorSwatch.graphics.newBrush(
                colorSwatch.graphics.BrushType.SOLID_COLOR, rgb
            );
        }

        // Restore the settings used at the last Create
        var isPathMode = loadSetting("targetType", "puppet") === "path";
        puppetOption.value = !isPathMode;
        pathPointsOption.value = isPathMode;
        var isAllScope = loadSetting("pinTarget", "selected") === "all";
        selectedOption.value = !isAllScope;
        allOption.value = isAllScope;
        shapeList.selection = toInt(loadSetting("shapeIndex", 0), 0, SHAPES.length - 1, 0);
        colorList.selection = toInt(loadSetting("colorIndex", 0), 0, COLORS.length - 1, 0);
        sizeSlider.value = toInt(loadSetting("size", 50), 0, 100, 50);
        sizeValue.text = String(Math.round(sizeSlider.value));
        parentingCheckbox.value = loadSetting("parenting", "0") === "1";
        setSwatchColor(COLORS[colorList.selection.index].rgb);

        sizeSlider.onChanging = function() {
            var val = Math.round(this.value);
            sizeValue.text = val.toString();
        };

        colorList.onChange = function() {
            setSwatchColor(COLORS[colorList.selection.index].rgb);
            colorSwatch.notify("onDraw");
        };

        generateBtn.onClick = function() {
            var colorIdx = colorList.selection.index;
            var shapeIdx = shapeList.selection.index;
            var sliderValue = Math.round(sizeSlider.value);

            config.targetType = puppetOption.value ? "puppet" : "path";
            config.pinTarget = selectedOption.value ? "selected" : "all";
            config.controlSize = mapSliderToControlSize(sliderValue);
            config.visualColor = COLORS[colorIdx].rgb.concat([1]);
            config.labelColor = COLORS[colorIdx].label;
            config.shapeType = SHAPES[shapeIdx];
            config.parentingMode = parentingCheckbox.value ? "enabled" : "none";

            saveSetting("targetType", config.targetType);
            saveSetting("pinTarget", config.pinTarget);
            saveSetting("shapeIndex", shapeIdx);
            saveSetting("colorIndex", colorIdx);
            saveSetting("size", sliderValue);
            saveSetting("parenting", parentingCheckbox.value ? "1" : "0");

            generatePinControllers();
        };

        panel.layout.layout(true);

        panel.onResizing = panel.onResize = function() {
            this.layout.resize();
        };

        return panel;
    }

    function generatePinControllers() {
        app.beginUndoGroup(config.targetType === "path" ? txt.undoPath : txt.undoPuppet);

        try {
            if (!(app.project.activeItem instanceof CompItem)) {
                alert(txt.errors.noComp);
                return;
            }

            var comp = app.project.activeItem;
            var targetLayers = comp.selectedLayers;

            if (targetLayers.length == 0) {
                alert(txt.errors.noLayer);
                return;
            }

            var totalLinked = 0;
            for (var i = 0; i < targetLayers.length; i++) {
                totalLinked += setupControllerLayers(targetLayers[i], comp, config);
            }

            if (totalLinked > 0) {
                alert(totalLinked + (config.targetType === "path" ? txt.success.pathPointsLinked : txt.success.pinsLinked));
            } else {
                alert(config.targetType === "path" ? txt.errors.noProcessedPathPoints : txt.errors.noProcessedPins);
            }
        } catch (err) {
            alert("Error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // Creates one controller per target puppet pin (path points are delegated to setupPathPointControllers)
    function setupControllerLayers(targetLayer, comp, config) {
        if (config.targetType === "path") {
            return setupPathPointControllers(targetLayer, comp, config);
        }

        var allPuppetPins = findAllPuppetPins(targetLayer.property("ADBE Effect Parade"));

        if (allPuppetPins.length == 0) {
            alert(formatMessage(txt.errors.noPins, targetLayer.name));
            return 0;
        }

        var targetPins = [];
        for (var i = 0; i < allPuppetPins.length; i++) {
            if (config.pinTarget === "all" || allPuppetPins[i].selected) {
                targetPins.push(allPuppetPins[i]);
            }
        }

        if (targetPins.length === 0) {
            alert(txt.errors.noSelectedPins);
            return 0;
        }

        var pinsProcessed = 0;
        var controllerLayers = [];

        for (var j = 0; j < targetPins.length; j++) {
            var currentPin = targetPins[j];
            var controlLayer = null;

            try {
                var mesh = currentPin.propertyGroup().propertyGroup();
                var puppetEffect = mesh.propertyGroup().propertyGroup().propertyGroup();

                var pinName = currentPin.name;

                controlLayer = createShapeController(comp, targetLayer, pinName, config);

                if (!controlLayer) continue;

                controlLayer.name = makeUniqueLayerName(comp, controlLayer.name, controlLayer.index);
                controlLayer.guideLayer = true;
                controlLayer.moveBefore(targetLayer);

                // Position at pin location (temporary expression; the target is referenced by index)
                var targetRef = "thisComp.layer(" + targetLayer.index + ")";
                var deformRef = targetRef + ".effect(\"" + escapeExpressionString(puppetEffect.name) + "\").arap.mesh(\"" + escapeExpressionString(mesh.name) + "\").deform(\"" + escapeExpressionString(pinName) + "\").position";
                controlLayer.position.expression = (targetLayer instanceof ShapeLayer) ? deformRef : targetRef + ".toWorld(" + deformRef + ")";

                var pinPosition = controlLayer.position.value;
                var positionError = controlLayer.position.expressionError;
                controlLayer.position.expression = "";
                if (positionError) {
                    throw new Error(positionError);
                }
                controlLayer.position.setValue(pinPosition);

                var ctrlNameEsc = escapeExpressionString(controlLayer.name);
                if (targetLayer instanceof ShapeLayer) {
                    currentPin.position.expression = "pinPos = thisComp.layer(\"" + ctrlNameEsc + "\").toWorld(thisComp.layer(\"" + ctrlNameEsc + "\").anchorPoint)";
                } else {
                    currentPin.position.expression = "pinPos = thisComp.layer(\"" + ctrlNameEsc + "\").toWorld(thisComp.layer(\"" + ctrlNameEsc + "\").anchorPoint);\nfromWorld(pinPos)";
                }

                // Link Scale if supported (Advanced/Bend pins)
                var pinScale = currentPin.property("Scale");
                if (pinScale != null && pinScale.canSetExpression) {
                    pinScale.expression = "thisComp.layer(\"" + ctrlNameEsc + "\").transform.scale";
                }
                // Link Rotation if supported (Advanced/Bend pins)
                var pinRotation = currentPin.property("Rotation");
                if (pinRotation != null && pinRotation.canSetExpression) {
                    pinRotation.expression = "thisComp.layer(\"" + ctrlNameEsc + "\").transform.rotation";
                }

                // Remove the keyframe AE adds when a pin is placed (clutter when pressing U)
                removeAutoKeyframe(currentPin.position);
                removeAutoKeyframe(pinScale);
                removeAutoKeyframe(pinRotation);

                addControlProperties(controlLayer, config);

                controllerLayers.push(controlLayer);

                pinsProcessed++;
            } catch (err) {
                if (controlLayer) {
                    controlLayer.remove();
                }
                alert(formatMessage(txt.errors.pinFailed, j + 1) + err.toString());
            }
        }

        finishControllers(controllerLayers, config);

        return pinsProcessed;
    }

    // Creates one controller per vertex of each target path on a shape layer
    function setupPathPointControllers(targetLayer, comp, config) {
        if (!(targetLayer instanceof ShapeLayer)) {
            alert(formatMessage(txt.errors.notShapeLayer, targetLayer.name));
            return 0;
        }

        var paths = findAllPaths(targetLayer);
        if (paths.length === 0) {
            alert(formatMessage(txt.errors.noPathPoints, targetLayer.name));
            return 0;
        }

        if (config.pinTarget === "selected") {
            var selectedPaths = [];
            for (var s = 0; s < paths.length; s++) {
                if (isPathSelected(paths[s].pathProperty)) {
                    selectedPaths.push(paths[s]);
                }
            }
            if (selectedPaths.length === 0) {
                alert(formatMessage(txt.errors.noSelectedPaths, targetLayer.name));
                return 0;
            }
            paths = selectedPaths;
        }

        var controllerLayers = [];
        var pointsProcessed = 0;
        var pointNumber = 0;

        for (var p = 0; p < paths.length; p++) {
            var pathProperty = paths[p].pathProperty;
            var refs = getPathExpressionRefs(pathProperty);
            var pathLabel = getPathLabel(pathProperty);
            var linkedIndices = [];
            var linkedNames = [];

            for (var k = 0; k < paths[p].vertexCount; k++) {
                pointNumber++;
                var controlLayer = null;

                try {
                    controlLayer = createShapeController(comp, targetLayer, pathLabel + "_Point" + k, config);
                    if (!controlLayer) continue;

                    controlLayer.name = makeUniqueLayerName(comp, controlLayer.name, controlLayer.index);
                    controlLayer.guideLayer = true;
                    controlLayer.moveBefore(targetLayer);

                    // Position at vertex location (ExtendScript has no toComp, so evaluate it as an expression)
                    controlLayer.position.expression = buildPathPointPositionExpression(targetLayer.index, refs, k);
                    var pointPosition = controlLayer.position.value;
                    var positionError = controlLayer.position.expressionError;
                    controlLayer.position.expression = "";
                    if (positionError) {
                        throw new Error(positionError);
                    }
                    controlLayer.position.setValue(pointPosition);

                    addControlProperties(controlLayer, config);
                    controllerLayers.push(controlLayer);
                    linkedIndices.push(k);
                    linkedNames.push(controlLayer.name);
                    pointsProcessed++;
                } catch (err) {
                    if (controlLayer) {
                        controlLayer.remove();
                    }
                    alert(formatMessage(txt.errors.pathPointFailed, pointNumber) + err.toString());
                }
            }

            // A path has only one expression, so a single expression drives all linked vertices
            if (linkedIndices.length > 0) {
                try {
                    pathProperty.expression = buildPathLinkExpression(refs, linkedIndices, linkedNames);
                    pathProperty.value; // evaluate once so expressionError is up to date
                    if (pathProperty.expressionError) {
                        throw new Error(pathProperty.expressionError);
                    }
                } catch (err) {
                    alert(txt.errors.expressionFailed + err.toString());
                }
            }
        }

        finishControllers(controllerLayers, config);

        return pointsProcessed;
    }

    // Apply label color and optional parenting to the created controllers
    function finishControllers(controllerLayers, config) {
        for (var m = 0; m < controllerLayers.length; m++) {
            controllerLayers[m].label = config.labelColor;
        }

        if (controllerLayers.length > 1 && config.parentingMode === "enabled") {
            setupParenting(controllerLayers);
        }
    }

    // Adds Size / Color / Opacity effects to a controller and drives its shape with them
    function addControlProperties(controlLayer, config) {
        try {
            var effects = controlLayer.property("ADBE Effect Parade");

            var sizeControl = effects.addProperty("ADBE Slider Control");
            sizeControl.name = "Size";
            sizeControl.property("ADBE Slider Control-0001").setValue(config.controlSize);

            var colorControl = effects.addProperty("ADBE Color Control");
            colorControl.name = "Color";
            colorControl.property("ADBE Color Control-0001").setValue(config.visualColor);

            var opacityControl = effects.addProperty("ADBE Slider Control");
            opacityControl.name = "Opacity";
            opacityControl.property("ADBE Slider Control-0001").setValue(config.visualAlpha * 100);

            setShapeExpressions(controlLayer);
        } catch (err) {
            alert(txt.errors.controlEffectsFailed + err.toString());
        }
    }

    function setShapeExpressions(shapeLayer) {
        try {
            var shapeContent = shapeLayer.property("ADBE Root Vectors Group").property(1);
            var vectorGroup = shapeContent.property("ADBE Vectors Group");

            var sizeExpression = "var controlSize = effect(\"Size\")(1);\n" +
                            "[controlSize, controlSize]";

            var ellipseShape = vectorGroup.property("ADBE Vector Shape - Ellipse");
            if (ellipseShape) {
                var ellipseSizeProperty = ellipseShape.property("ADBE Vector Ellipse Size");
                ellipseSizeProperty.expression = sizeExpression;
            }

            var rectShape = vectorGroup.property("ADBE Vector Shape - Rect");
            if (rectShape) {
                var rectSizeProperty = rectShape.property("ADBE Vector Rect Size");
                rectSizeProperty.expression = sizeExpression;
            }

            var fillProperty = vectorGroup.property("ADBE Vector Graphic - Fill");
            var colorProperty = fillProperty.property("ADBE Vector Fill Color");

            var colorExpression = "effect(\"Color\")(1)";

            colorProperty.expression = colorExpression;

            var opacityExpression = "effect(\"Opacity\")(1)";

            shapeLayer.transform.opacity.expression = opacityExpression;
        } catch (err) {
            alert(txt.errors.expressionFailed + err.toString());
        }
    }

    function createShapeController(comp, targetLayer, pinName, config) {
        try {
            var shapeController = comp.layers.addShape();
            if (!shapeController) {
                return null;
            }
            shapeController.name = targetLayer.name + "_" + pinName + "_Shape";

            var shapeSize = config.controlSize;

            var shapeGroup = shapeController.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            var contents = shapeGroup.property("ADBE Vectors Group");

            if (config.shapeType === "circle") {
                var circle = contents.addProperty("ADBE Vector Shape - Ellipse");
                circle.property("ADBE Vector Ellipse Size").setValue([shapeSize, shapeSize]);
            } else if (config.shapeType === "square") {
                var square = contents.addProperty("ADBE Vector Shape - Rect");
                square.property("ADBE Vector Rect Size").setValue([shapeSize, shapeSize]);
                square.property("ADBE Vector Rect Roundness").setValue(0);
            }

            var fill = contents.addProperty("ADBE Vector Graphic - Fill");
            fill.property("ADBE Vector Fill Color").setValue(config.visualColor);

            var outline = contents.addProperty("ADBE Vector Graphic - Stroke");
            outline.property("ADBE Vector Stroke Color").setValue([0, 0, 0, 1]);
            outline.property("ADBE Vector Stroke Width").setValue(2);

            return shapeController;
        } catch (err) {
            return null;
        }
    }

    // Map slider (0-100) to actual controller size (30-150 range)
    function mapSliderToControlSize(normalizedValue) {
        var v = Math.max(0, Math.min(100, normalizedValue));
        return Math.round(0.006 * v * v + 0.6 * v + 30);
    }

    // Remove the single keyframe AE creates when a pin is placed.
    // Properties with 2+ keyframes were animated by the user and are left untouched.
    function removeAutoKeyframe(prop) {
        if (prop == null) return;
        try {
            if (prop.numKeys === 1) {
                prop.removeKey(1);
            }
        } catch (e) { /* ignore */ }
    }

    // Escape a string for use inside a double-quoted expression string literal
    function escapeExpressionString(str) {
        return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    }

    // Return a layer name not used by any other layer in the comp ("name", "name 2", "name 3"...)
    function makeUniqueLayerName(comp, baseName, selfIndex) {
        var name = baseName;
        var n = 2;
        var exists = true;
        while (exists) {
            exists = false;
            for (var i = 1; i <= comp.numLayers; i++) {
                if (i !== selfIndex && comp.layer(i).name === name) {
                    exists = true;
                    name = baseName + " " + n;
                    n++;
                    break;
                }
            }
        }
        return name;
    }

    // Label for controller names: "Group 1_Path 1" (or "Path 1" when the path is at the contents root)
    function getPathLabel(pathProperty) {
        var pathGroup = pathProperty.propertyGroup();
        var label = pathGroup ? pathGroup.name : "Path";
        var ownerGroup = pathGroup ? pathGroup.propertyGroup(2) : null;
        if (ownerGroup != null && ownerGroup.matchName === "ADBE Vector Group") {
            label = ownerGroup.name + "_" + label;
        }
        return label;
    }

    // True if the path, or any shape group containing it, is selected in the Timeline
    function isPathSelected(pathProperty) {
        var p = pathProperty;
        while (p != null) {
            if (p.selected) return true;
            if (p.matchName === "ADBE Root Vectors Group") break;
            p = p.propertyGroup();
        }
        return false;
    }

    // Build expression references from a layer to a path property
    // pathRef:   '.content("Group 1").content("Path 1").path'
    // groupRefs: ['.content("Group 1")'] (enclosing shape groups, outermost first)
    function getPathExpressionRefs(pathProperty) {
        var chain = [];
        var p = pathProperty.propertyGroup();
        while (p != null && p.matchName !== "ADBE Root Vectors Group") {
            chain.unshift(p);
            p = p.propertyGroup();
        }

        var ref = "";
        var groupRefs = [];
        for (var i = 0; i < chain.length; i++) {
            var mn = chain[i].matchName;
            if (mn === "ADBE Vector Group" || mn === "ADBE Vector Shape - Group") {
                ref += ".content(\"" + escapeExpressionString(chain[i].name) + "\")";
                if (mn === "ADBE Vector Group") {
                    groupRefs.push(ref);
                }
            }
        }
        return { pathRef: ref + ".path", groupRefs: groupRefs };
    }

    // Expression helpers for shape group transforms (anchor, scale, rotation, position; skew is ignored)
    var GROUP_TO_PARENT_EXPR =
        "function groupToParent(t, p) {\n" +
        "    var a = t.anchorPoint.value, s = t.scale.value, o = t.position.value;\n" +
        "    var r = degreesToRadians(t.rotation.value);\n" +
        "    var x = (p[0] - a[0]) * s[0] / 100, y = (p[1] - a[1]) * s[1] / 100;\n" +
        "    return [o[0] + x * Math.cos(r) - y * Math.sin(r), o[1] + x * Math.sin(r) + y * Math.cos(r)];\n" +
        "}";

    var PARENT_TO_GROUP_EXPR =
        "function parentToGroup(t, p) {\n" +
        "    var a = t.anchorPoint.value, s = t.scale.value, o = t.position.value;\n" +
        "    var r = degreesToRadians(t.rotation.value);\n" +
        "    var x = p[0] - o[0], y = p[1] - o[1];\n" +
        "    var u = x * Math.cos(r) + y * Math.sin(r), v = y * Math.cos(r) - x * Math.sin(r);\n" +
        "    return [(s[0] != 0 ? u * 100 / s[0] : 0) + a[0], (s[1] != 0 ? v * 100 / s[1] : 0) + a[1]];\n" +
        "}";

    // Temporary expression (on a controller's position) that returns the comp position of a vertex
    function buildPathPointPositionExpression(layerIndex, refs, pointIndex) {
        var lines = [];
        if (refs.groupRefs.length > 0) {
            lines.push(GROUP_TO_PARENT_EXPR);
        }
        lines.push("var L = thisComp.layer(" + layerIndex + ");");
        lines.push("var p = L" + refs.pathRef + ".points()[" + pointIndex + "];");
        for (var i = refs.groupRefs.length - 1; i >= 0; i--) {
            lines.push("p = groupToParent(L" + refs.groupRefs[i] + ".transform, p);");
        }
        lines.push("L.toComp(p);");
        return lines.join("\n");
    }

    // Path expression that moves each linked vertex to its controller's anchor point
    function buildPathLinkExpression(refs, pointIndices, ctrlNames) {
        var quotedNames = [];
        for (var n = 0; n < ctrlNames.length; n++) {
            quotedNames.push("\"" + escapeExpressionString(ctrlNames[n]) + "\"");
        }

        var lines = [];
        lines.push("var ctrlIdx = [" + pointIndices.join(", ") + "];");
        lines.push("var ctrlNames = [" + quotedNames.join(", ") + "];");
        if (refs.groupRefs.length > 0) {
            lines.push(PARENT_TO_GROUP_EXPR);
        }
        lines.push("function toPathSpace(p) {");
        lines.push("    var q = thisLayer.fromComp(p);");
        lines.push("    q = [q[0], q[1]];");
        for (var i = 0; i < refs.groupRefs.length; i++) {
            lines.push("    q = parentToGroup(thisLayer" + refs.groupRefs[i] + ".transform, q);");
        }
        lines.push("    return q;");
        lines.push("}");
        lines.push("var pts = thisProperty.points();");
        lines.push("for (var i = 0; i < ctrlIdx.length; i++) {");
        lines.push("    if (ctrlIdx[i] >= pts.length) continue;");
        lines.push("    var c = null;");
        // A deleted controller leaves its vertex at the original position instead of breaking the path
        lines.push("    try { c = thisComp.layer(ctrlNames[i]); } catch (e) {}");
        lines.push("    if (c) pts[ctrlIdx[i]] = toPathSpace(c.toComp(c.anchorPoint));");
        lines.push("}");
        lines.push("createPath(pts, thisProperty.inTangents(), thisProperty.outTangents(), thisProperty.isClosed());");
        return lines.join("\n");
    }

    // Recursively find all path properties (ADBE Vector Shape) that have vertices
    function findAllPaths(targetLayer) {
        var list = [];
        var root = targetLayer.property("ADBE Root Vectors Group");
        if (root == null) return list;

        function recurse(prop) {
            if (prop == null) return;
            if (prop.matchName === "ADBE Vector Shape") {
                try {
                    var shapeValue = prop.value;
                    if (shapeValue && shapeValue.vertices && shapeValue.vertices.length > 0) {
                        list.push({
                            pathProperty: prop,
                            vertexCount: shapeValue.vertices.length
                        });
                    }
                } catch (e) { /* skip if value not readable */ }
                return;
            }
            if (prop.numProperties > 0) {
                for (var i = 1; i <= prop.numProperties; i++) {
                    recurse(prop.property(i));
                }
            }
        }
        recurse(root);
        return list;
    }

    // Collect the puppet pins of all Puppet effects, in creation order.
    // AE adds each new pin at the top of its Deform group, so each group is read bottom-up.
    function findAllPuppetPins(effects) {
        var pinList = [];
        if (effects == null) return pinList;

        function recurse(group) {
            var groupPins = [];
            for (var i = 1; i <= group.numProperties; i++) {
                var prop = group.property(i);
                if (PUPPET_PIN_MATCH_NAMES[prop.matchName]) {
                    groupPins.unshift(prop);
                } else if (prop.numProperties > 0) {
                    recurse(prop);
                }
            }
            pinList = pinList.concat(groupPins);
        }

        for (var e = 1; e <= effects.numProperties; e++) {
            var effect = effects.property(e);
            if (effect.matchName === "ADBE FreePin3") {
                recurse(effect);
            }
        }

        return pinList;
    }

    // Chain parenting in creation order: the 1st controller is the top parent, 2nd is its child, and so on.
    // Controllers are already stacked in this order directly above the target layer.
    function setupParenting(controllerLayers) {
        for (var i = 1; i < controllerLayers.length; i++) {
            controllerLayers[i].parent = controllerLayers[i - 1];
        }
    }

    // Display panel
    var toolPanel = createInterface(ctx);

    if (toolPanel instanceof Window) {
        toolPanel.center();
        toolPanel.show();
    }

})(this);
