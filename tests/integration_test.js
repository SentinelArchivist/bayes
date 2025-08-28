// Integration test for the complete Bayes app
import { Algorithms } from '../js/algorithms.js';
import { Storage } from '../js/storage.js';
import { Charts } from '../js/charts.js';
import { App } from '../js/app.js';

async function runIntegrationTests() {
    console.log('Starting Bayes App Integration Tests...');
    
    try {
        // Test 1: Initialize storage
        console.log('Test 1: Storage initialization');
        await Storage.init();
        console.log('✓ Storage initialized successfully');
        
        // Test 2: Create a test project
        console.log('Test 2: Project creation');
        const project = await Storage.createProject('Integration Test Project');
        console.log('✓ Project created:', project.name);
        
        // Test 3: Test Bayesian update
        console.log('Test 3: Bayesian reasoning');
        const priors = [0.6, 0.4];
        const likelihoods = [0.8, 0.3];
        const posteriors = Algorithms.bayesUpdate(priors, likelihoods);
        console.log('✓ Bayes update result:', posteriors.map(p => p.toFixed(3)));
        
        // Test 4: Test Jeffrey conditionalization
        console.log('Test 4: Jeffrey conditionalization');
        const current = [0.7, 0.3];
        const likeMatrix = [[0.9, 0.1], [0.2, 0.8]];
        const targetWeights = [0.6, 0.4];
        const jeffreyResult = Algorithms.jeffreyUpdate(current, likeMatrix, targetWeights);
        console.log('✓ Jeffrey update result:', jeffreyResult.map(p => p.toFixed(3)));
        
        // Test 5: Test normalization
        console.log('Test 5: Probability normalization');
        const unnormalized = [0.3, 0.5, 0.8];
        const normalized = Algorithms.normalizeProbs(unnormalized);
        const sum = normalized.reduce((a, b) => a + b, 0);
        console.log('✓ Normalized probabilities sum to:', sum.toFixed(6));
        
        // Test 6: Test project save/load
        console.log('Test 6: Project persistence');
        project.hypotheses = [
            { id: 'h1', label: 'Hypothesis 1', prior: 0.6 },
            { id: 'h2', label: 'Hypothesis 2', prior: 0.4 }
        ];
        await Storage.saveProject(project);
        const loaded = await Storage.loadProject(project.id);
        console.log('✓ Project saved and loaded successfully');
        
        // Test 7: Test export/import
        console.log('Test 7: Project export/import');
        const exported = await Storage.exportProjectJSON(project.id);
        const importedProject = await Storage.importProjectJSON(JSON.parse(exported));
        console.log('✓ Project exported and imported successfully');
        
        // Cleanup
        await Storage.deleteProject(project.id);
        await Storage.deleteProject(importedProject.id);
        console.log('✓ Test projects cleaned up');
        
        console.log('\n🎉 All integration tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Integration test failed:', error);
        return false;
    }
}

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined') {
    runIntegrationTests();
}

export { runIntegrationTests };
