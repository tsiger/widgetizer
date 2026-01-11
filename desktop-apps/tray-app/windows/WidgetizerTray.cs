using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using System.Drawing;
using System.Net;

namespace WidgetizerTray
{
    public class TrayApp : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private Process nodeProcess;
        private string appPath;
        private string nodePath;
        private string serverPath;
        private System.Threading.Mutex mutex; // Keep mutex alive

        public TrayApp()
        {
            // Check if already running (SINGLE INSTANCE)
            bool createdNew;
            mutex = new System.Threading.Mutex(true, "WidgetizerTrayApp", out createdNew);
            
            if (!createdNew)
            {
                MessageBox.Show(
                    "Widgetizer is already running!\n\nCheck your system tray.",
                    "Already Running",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                Application.Exit();
                return;
            }
            
            // Get paths
            appPath = Application.StartupPath;
            nodePath = Path.Combine(appPath, "bin", "node", "node.exe");
            serverPath = Path.Combine(appPath, "server", "index.js");

            // Validate paths
            if (!File.Exists(nodePath))
            {
                MessageBox.Show(
                    "Node.js not found. Please ensure Widgetizer is properly installed.",
                    "Missing Node.js",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                Application.Exit();
                return;
            }

            if (!File.Exists(serverPath))
            {
                MessageBox.Show(
                    "Server files not found. Please ensure Widgetizer is properly installed.",
                    "Missing Files",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                Application.Exit();
                return;
            }

            trayIcon = new NotifyIcon()
            {
                Icon = Icon.ExtractAssociatedIcon(System.Reflection.Assembly.GetExecutingAssembly().Location),
                ContextMenu = new ContextMenu(new MenuItem[] {
                    new MenuItem("Open Widgetizer", OpenBrowser),
                    new MenuItem("Restart Server", RestartServer),
                    new MenuItem("-"),
                    new MenuItem("Exit", Exit)
                }),
                Visible = true,
                Text = "Widgetizer"
            };

            // Double-click to open
            trayIcon.DoubleClick += OpenBrowser;

            // Auto-start server
            StartServer();
        }

        private void StartServer()
        {
            try
            {
                // Create .env if it doesn't exist
                string envPath = Path.Combine(appPath, ".env");
                if (!File.Exists(envPath))
                {
                    File.WriteAllText(envPath, "NODE_ENV=production\nPORT=3001\n");
                }

                // Show loading notification
                trayIcon.ShowBalloonTip(
                    3000, 
                    "Widgetizer", 
                    "Starting server, please wait...", 
                    ToolTipIcon.Info
                );

                nodeProcess = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = nodePath,
                        Arguments = $"\"{serverPath}\"",
                        WorkingDirectory = appPath,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    }
                };

                nodeProcess.Start();
                
                // Wait until server is ready (smart wait)
                bool serverReady = WaitForServer();
                
                if (serverReady)
                {
                    // Server ready! Show success
                    trayIcon.ShowBalloonTip(
                        2000, 
                        "Widgetizer", 
                        "Server is ready!", 
                        ToolTipIcon.Info
                    );
                    
                    // Small delay so user sees the "ready" message
                    System.Threading.Thread.Sleep(1000);
                    
                    // Open browser
                    OpenBrowser(null, null);
                }
                else
                {
                    // Timeout - show warning
                    trayIcon.ShowBalloonTip(
                        5000, 
                        "Widgetizer", 
                        "Server is taking longer than usual. You can open it manually from the tray menu.", 
                        ToolTipIcon.Warning
                    );
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Failed to start server:\n\n{ex.Message}", 
                    "Error", 
                    MessageBoxButtons.OK, 
                    MessageBoxIcon.Error
                );
            }
        }

        private bool WaitForServer()
        {
            // Try for up to 15 seconds
            for (int i = 0; i < 30; i++)
            {
                System.Threading.Thread.Sleep(500);
                
                try
                {
                    using (var client = new WebClient())
                    {
                        client.DownloadString("http://localhost:3001");
                        return true; // Server is ready!
                    }
                }
                catch
                {
                    // Server not ready yet, continue waiting
                }
            }
            
            return false; // Timeout
        }

        private void RestartServer(object sender, EventArgs e)
        {
            trayIcon.ShowBalloonTip(2000, "Widgetizer", "Restarting server...", ToolTipIcon.Info);
            StopServer();
            System.Threading.Thread.Sleep(1000);
            StartServer();
        }

        private void StopServer()
        {
            if (nodeProcess != null && !nodeProcess.HasExited)
            {
                try
                {
                    nodeProcess.Kill();
                    nodeProcess.WaitForExit(2000);
                    nodeProcess.Dispose();
                }
                catch
                {
                    // Ignore errors during shutdown
                }
            }
        }

        private void OpenBrowser(object sender, EventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "http://localhost:3001",
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Failed to open browser:\n\n{ex.Message}\n\nPlease open http://localhost:3001 manually.", 
                    "Error", 
                    MessageBoxButtons.OK, 
                    MessageBoxIcon.Warning
                );
            }
        }

        private void Exit(object sender, EventArgs e)
        {
            StopServer();
            trayIcon.Visible = false;
            
            // Release mutex
            if (mutex != null)
            {
                mutex.ReleaseMutex();
                mutex.Dispose();
            }
            
            Application.Exit();
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new TrayApp());
        }
    }
}