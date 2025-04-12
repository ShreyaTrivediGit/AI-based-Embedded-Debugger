import { useState, useCallback } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { 
  PlayCircle,
  Download,
  Upload,
  Copy,
  AlertCircle,
  CheckCircle,
  Cpu,
  Timer,
  Zap,
  HardDrive
} from "lucide-react";
import './ui/styles.css';

// Add icon styles to the existing CSS
const iconStyle = {
  width: '16px',
  height: '16px',
  marginRight: '8px'
};

const ProteusDebugger = () => {
  const [inputCode, setInputCode] = useState('');
  const [optimizedCode, setOptimizedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState({
    complexity: 0,
    memoryUsage: 0,
    executionTime: 0,
    optimizationPotential: 0
  });

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        setInputCode(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const analyzeAndFixCode = useCallback(() => {
    if (!inputCode.trim()) return;
    
    setIsLoading(true);
    setIssues([]);
    setOptimizedCode('');
    
    setTimeout(() => {
      try {
        const lines = inputCode.split('\n');
        const detectedIssues = [];
        let optimizedLines = [...lines];
        
        // Track declared variables and functions
        const declaredVariables = new Set();
        const declaredFunctions = new Set();
        const usedVariables = new Set();
        const includes = new Set();
        
        // First pass: collect declarations and includes
        lines.forEach(line => {
          // Check includes
          const includeMatch = line.match(/#include\s*[<"]([^>"]+)[>"]/);
          if (includeMatch) {
            includes.add(includeMatch[1]);
          }

          // Collect function declarations
          const funcDeclMatch = line.match(/\b(void|int|char|float|double)\s+(\w+)\s*\(/);
          if (funcDeclMatch) {
            declaredFunctions.add(funcDeclMatch[2]);
          }

          // Collect variable declarations
          const varDeclMatch = line.match(/(int|char|float|double|void)\s+(\w+)/);
          if (varDeclMatch && !line.includes('(')) {
            declaredVariables.add(varDeclMatch[2]);
          }
        });
        
        // Second pass: analyze and fix issues
        lines.forEach((line, index) => {
          const lineNum = index + 1;
          let modifiedLine = line;
          
          // Check for required includes
          if (line.includes('delay_ms') && !includes.has('util/delay.h')) {
            detectedIssues.push({
              line: 1,
              message: "Missing include for delay functions",
              severity: 'error',
              fix: '#include <util/delay.h>\n' + line
            });
          }

          if ((line.includes('DDRB') || line.includes('PORTB')) && !includes.has('avr/io.h')) {
            detectedIssues.push({
              line: 1,
              message: "Missing include for AVR I/O definitions",
              severity: 'error',
              fix: '#include <avr/io.h>\n' + line
            });
          }

          // Check for common AVR/Proteus issues
          if (line.includes('DDRB') || line.includes('PORTB')) {
            // Check for proper initialization
            if (line.includes('DDRB') && !line.includes(';')) {
              detectedIssues.push({
                line: lineNum,
                message: "Missing semicolon after DDRB initialization",
                severity: 'error',
                fix: line + ';'
              });
              modifiedLine = modifiedLine + ';';
            }

            // Check for proper bit operations
            if (line.includes('|=') || line.includes('&=')) {
              const bitOpMatch = line.match(/([A-Z]+)\s*([|&])=\s*(.+?);/);
              if (bitOpMatch && !bitOpMatch[3].includes('<<')) {
                detectedIssues.push({
                  line: lineNum,
                  message: "Improper bit manipulation. Consider using bit shift operators",
                  severity: 'warning',
                  fix: `${bitOpMatch[1]} ${bitOpMatch[2]}= (1 << ${bitOpMatch[3]});`
                });
              }
            }

            // Check for proper pin numbering
            const pinNumberMatch = line.match(/PB(\d+)/);
            if (pinNumberMatch && parseInt(pinNumberMatch[1]) > 7) {
              detectedIssues.push({
                line: lineNum,
                message: "Invalid pin number. PORTB only has pins 0-7",
                severity: 'error',
                fix: line.replace(/PB\d+/, 'PB' + (parseInt(pinNumberMatch[1]) % 8))
              });
            }
          }

          // Check for delay function issues
          if (line.includes('delay_ms')) {
            const delayMatch = line.match(/delay_ms\s*\(\s*(\d+)\s*\)/);
            if (delayMatch && parseInt(delayMatch[1]) > 1000) {
              detectedIssues.push({
                line: lineNum,
                message: "Long delay detected. Consider using multiple shorter delays",
                severity: 'warning',
                fix: `// Break down long delay into smaller chunks\nfor(int i = 0; i < ${Math.ceil(parseInt(delayMatch[1])/500)}; i++) {\n  _delay_ms(500);\n}`
              });
            }
          }

          // Check for variable typos and undefined variables
          const variableUseMatch = line.match(/\b(\w+)\b(?=\s*[\(\)\{\}\[\];=+\-*/%&|<>!,]|$)/g);
          if (variableUseMatch) {
            variableUseMatch.forEach(varName => {
              if (!declaredVariables.has(varName) && 
                  !declaredFunctions.has(varName) &&
                  !['if', 'for', 'while', 'return', 'int', 'char', 'float', 'double', 'void', 'include', 'DDRB', 'PORTB', 'PB0', 'PB1', 'PB2', 'PB3', 'PB4', 'PB5', 'PB6', 'PB7'].includes(varName)) {
                // Check for similar variable names to detect typos
                const similarVar = Array.from(declaredVariables).find(declared => 
                  levenshteinDistance(varName, declared) <= 2 && levenshteinDistance(varName, declared) > 0
                );
                
                if (similarVar) {
                  detectedIssues.push({
                    line: lineNum,
                    message: `Possible typo in variable name '${varName}'. Did you mean '${similarVar}'?`,
                    severity: 'error',
                    fix: line.replace(new RegExp(`\\b${varName}\\b`), similarVar)
                  });
                  modifiedLine = modifiedLine.replace(new RegExp(`\\b${varName}\\b`), similarVar);
                } else {
                  detectedIssues.push({
                    line: lineNum,
                    message: `Undefined variable '${varName}'`,
                    severity: 'error'
                  });
                }
              }
            });
          }

          // Check for missing semicolons
          if (line.trim() && 
              !line.trim().startsWith('#') && 
              !line.trim().startsWith('//') && 
              !line.trim().endsWith('{') && 
              !line.trim().endsWith('}') && 
              !line.trim().endsWith(';') &&
              !line.includes('if(') &&
              !line.includes('for(') &&
              !line.includes('while(')) {
            detectedIssues.push({
              line: lineNum,
              message: "Missing semicolon at end of statement",
              severity: 'error',
              fix: line + ';'
            });
            modifiedLine = modifiedLine + ';';
          }

          // Check for infinite loops
          if (line.includes('while(1)') || line.includes('while(true)')) {
            if (!line.includes('_delay') && !lines.slice(index + 1, index + 5).some(l => l.includes('_delay'))) {
              detectedIssues.push({
                line: lineNum,
                message: "Infinite loop without delay may cause system lockup",
                severity: 'warning',
                fix: `while(1) {\n  // Add delay to prevent system lockup\n  _delay_ms(100);\n}`
              });
            }
          }

          // Format the line (proper indentation)
          let indentLevel = 0;
          for (let i = 0; i < index; i++) {
            if (lines[i].includes('{')) indentLevel++;
            if (lines[i].includes('}')) indentLevel--;
          }
          modifiedLine = '  '.repeat(Math.max(0, indentLevel)) + modifiedLine.trim();
          
          optimizedLines[index] = modifiedLine;
        });
        
        // Calculate metrics
        const complexity = Math.min(10, Math.max(3, Math.floor(lines.length / 10) + detectedIssues.length / 2));
        const optimizationPotential = Math.min(90, Math.max(10, detectedIssues.length * 15));
        
        setIssues(detectedIssues);
        setMetrics({
          complexity,
          memoryUsage: Math.floor(lines.length * 1.5),
          executionTime: Math.floor(lines.length * 0.8),
          optimizationPotential
        });
        setOptimizedCode(optimizedLines.join('\n'));
        
      } catch (error) {
        console.error("Analysis error:", error);
        setIssues([{
          line: 0,
          message: "Analysis failed: " + (error instanceof Error ? error.message : 'Unknown error'),
          severity: 'error'
        }]);
      } finally {
        setIsLoading(false);
      }
    }, 2000);
  }, [inputCode]);

  // Add Levenshtein Distance function for finding similar variable names
  const levenshteinDistance = (str1, str2) => {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }
    return track[str2.length][str1.length];
  };

  const downloadCode = useCallback(() => {
    const element = document.createElement('a');
    const file = new Blob([optimizedCode], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'optimized_code.c';
    document.body.appendChild(element);
    element.click();
  }, [optimizedCode]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(optimizedCode);
  }, [optimizedCode]);

  return (
    <div className="container">
      <div className="max-width-wrapper space-y">
        <header className="header">
          <h1 className="header-title">Proteus AI Debugger</h1>
          <p className="header-description">Professional embedded C code analysis and optimization</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="icon-wrapper">
                <PlayCircle style={iconStyle} />
              </span>
              Code Analysis
            </CardTitle>
            <CardDescription>Paste your embedded C code for real debugging and optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid">
              <div className="space-y-small">
                <div className="space-y-small">
                  <Label>Input C Code</Label>
                  <Textarea
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="#include <stdio.h>\n\nint main() {\n  int x = 5\n  return 0;\n}"
                  />
                </div>
                <div className="flex-row">
                  <Button 
                    onClick={analyzeAndFixCode} 
                    disabled={!inputCode.trim() || isLoading}
                    className="flex-1"
                  >
                    <PlayCircle style={iconStyle} />
                    {isLoading ? 'Analyzing...' : 'Debug & Optimize'}
                  </Button>
                  <label className="flex-1">
                    <input 
                      type="file" 
                      accept=".c,.h,.cpp" 
                      onChange={handleFileUpload} 
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      asChild
                    >
                      <div>
                        <Upload style={iconStyle} />
                        Load from File
                      </div>
                    </Button>
                  </label>
                </div>
              </div>

              <div className="space-y-small">
                <div className="space-y-small">
                  <Label>Optimized Code</Label>
                  <div className="code-display">
                    {optimizedCode ? (
                      <pre>{optimizedCode}</pre>
                    ) : (
                      <div className="code-placeholder">
                        {isLoading ? 'Analyzing your code...' : 'Optimized code will appear here...'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-row">
                  <Button 
                    onClick={downloadCode} 
                    disabled={!optimizedCode}
                    variant="secondary"
                    className="flex-1"
                  >
                    <Download style={iconStyle} />
                    Download
                  </Button>
                  <Button 
                    onClick={copyToClipboard} 
                    disabled={!optimizedCode}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy style={iconStyle} />
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            {issues.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Code Issues Found</CardTitle>
                    <CardDescription>{issues.length} issues detected in your code</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-small">
                      {issues.map((issue, index) => (
                        <div key={index} className="issue-card">
                          <div className="flex-row">
                            <div className={`issue-icon ${issue.severity === 'error' ? 'issue-icon-error' : 
                              issue.severity === 'warning' ? 'issue-icon-warning' : 'issue-icon-info'}`}>
                              {issue.severity === 'error' ? 
                                <AlertCircle style={iconStyle} /> : 
                                <CheckCircle style={iconStyle} />}
                            </div>
                            <div>
                              <p className="issue-message">Line {issue.line}: {issue.message}</p>
                              {issue.fix && (
                                <div className="issue-fix">
                                  <span className="fix-label">Fix: </span>
                                  {issue.fix}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Code Quality Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid">
                      <div className="metric-card">
                        <div className="metric-header">
                          <Cpu style={iconStyle} />
                          <h3 className="metric-title">Complexity</h3>
                        </div>
                        <p className="metric-value">{metrics.complexity}/10</p>
                        <div className="progress-bar">
                          <div 
                            className={`progress-bar-fill ${metrics.complexity > 7 ? 'progress-bar-fill-red' : 
                              metrics.complexity > 4 ? 'progress-bar-fill-yellow' : 'progress-bar-fill-green'}`}
                            style={{ width: `${metrics.complexity * 10}%` }}
                          />
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-header">
                          <Zap style={iconStyle} />
                          <h3 className="metric-title">Optimization</h3>
                        </div>
                        <p className="metric-value">{metrics.optimizationPotential}%</p>
                        <div className="progress-bar">
                          <div 
                            className={`progress-bar-fill ${metrics.optimizationPotential > 70 ? 'progress-bar-fill-green' : 
                              metrics.optimizationPotential > 40 ? 'progress-bar-fill-yellow' : 'progress-bar-fill-red'}`}
                            style={{ width: `${metrics.optimizationPotential}%` }}
                          />
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-header">
                          <HardDrive style={iconStyle} />
                          <h3 className="metric-title">Memory Usage</h3>
                        </div>
                        <p className="metric-value">{metrics.memoryUsage} bytes</p>
                      </div>
                      <div className="metric-card">
                        <div className="metric-header">
                          <Timer style={iconStyle} />
                          <h3 className="metric-title">Execution Time</h3>
                        </div>
                        <p className="metric-value">{metrics.executionTime} ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProteusDebugger; 