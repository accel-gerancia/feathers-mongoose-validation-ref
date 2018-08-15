function validateId (app, refModelName, value) {
    return app.service(refModelName).get(value);
}

function validateIdArray (app, refModelName, values) {
    return Promise.all(values.map(v => app.service(refModelName).get(v)));
}

module.exports = exports = function lastModifiedPlugin (schema, options) {
    const app = options.app;

    schema.eachPath(function (path, schemaType) {
        if (!!this.isModified && !this.isModified(path)) {
            return true;
        }

        var validateFunction = null
        var refModelName = null

        if (schemaType.options && schemaType.options.ref) {
            validateFunction = validateId
            refModelName = schemaType.options.ref
        } else if (schemaType.caster && schemaType.caster.instance &&
            schemaType.caster.options && schemaType.caster.options.ref) {
            validateFunction = validateIdArray
            refModelName = schemaType.caster.options.ref
        }

        if(!validateFunction) {
            return true;
        }
        
        schema.path(path).validate({
            isAsync: true,
            validator: function(value, respond) {
                validateFunction(app, refModelName, value)
                    .then(result => {
                        if(Array.isArray(result)) {
                            let index = 0;
                            if(result.some((r, i) => {
                                index = i;
                                return r.code === 404;
                            })) {
                                return respond(false, `${path} with id ${value[index]} does not exist`);
                            }

                            return respond(true);
                        }
                        
                        if(result.code === 404) {
                            return respond(false, `${path} with id ${value} does not exist`);
                        }

                        respond(true);
                    })
                    .catch(err => {
                        respond(false);
                    });
            }
        });
    });
}