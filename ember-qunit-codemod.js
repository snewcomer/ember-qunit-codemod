module.exports = function(file, api, options) {
  const j = api.jscodeshift;

  const printOptions = options.printOptions || { quote: 'single' };
  const root = j(file.source);

  // Find `ember-qunit` imports
  let emberQUnitImports = root.find(j.ImportDeclaration, { source: { value: 'ember-qunit' } });
  if (emberQUnitImports.size() === 0) {
    return file.source;
  }

  // Find `module` and `test` imports
  let migrateToQUnitImport = ['test', 'skip'];

  // Replace old with new test helpers imports
  let removedQUnitImports = emberQUnitImports
    .find(j.ImportSpecifier)
    .filter(p => migrateToQUnitImport.includes(p.node.imported.name));

  if (removedQUnitImports.size() !== 0) {
    // Find existing `qunit` imports
    let qunitImports = root.find(j.ImportDeclaration, { source: { value: 'qunit' } });
    if (qunitImports.size() > 0) {
      // Iterate removed imports
      removedQUnitImports.forEach(p => {
        // Check if the imported name already exists
        let foundSpecifier = qunitImports.find(j.ImportSpecifier, {
          imported: { name: p.node.imported.name },
        });
        if (foundSpecifier.size() === 0) {
          // Add the specifier being removed, if it wasn't already present
          let specifier = j.importSpecifier(j.identifier(p.node.imported.name));
          qunitImports.forEach(p => p.node.specifiers.push(specifier));
        }
      });
    } else {
      // Build up array of specifiers for the new import statement
      let qunitImportSpecifiers = [];
      removedQUnitImports.forEach(p => {
        let specifier = j.importSpecifier(j.identifier(p.node.imported.name));
        qunitImportSpecifiers.push(specifier);
      });

      // Add new `import { ... } from 'qunit'` node
      let newQUnitImport = j.importDeclaration(qunitImportSpecifiers, j.literal('qunit'));
      emberQUnitImports.insertBefore(newQUnitImport);
    }

    removedQUnitImports.remove();
  }

  return root.toSource(printOptions);
};
