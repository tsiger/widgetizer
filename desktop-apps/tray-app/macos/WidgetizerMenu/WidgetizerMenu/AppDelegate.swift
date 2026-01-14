import Cocoa
import UserNotifications

class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    
    // MARK: - Properties
    private var statusItem: NSStatusItem!
    private var nodeProcess: Process?
    private var appPath: String!
    private var nodePath: String!
    private var serverPath: String!
    private let port = 3001
    
    // MARK: - App Lifecycle
    func applicationDidFinishLaunching(_ notification: Notification) {
        print("App starting...")
        
        // Check for single instance using file lock
        if !acquireSingleInstanceLock() {
            showAlert(
                title: "Already Running",
                message: "Widgetizer is already running!\n\nCheck your menu bar.",
                style: .informational
            )
            NSApp.terminate(nil)
            return
        }
        
        // Setup paths
        setupPaths()
        print("App path: \(appPath ?? "nil")")
        print("Node path: \(nodePath ?? "nil")")
        print("Server path: \(serverPath ?? "nil")")
        
        // Setup menu bar FIRST (before validation so user can see the icon)
        setupMenuBar()
        print("Menu bar setup complete")
        
        // Validate installation
        guard validateInstallation() else {
            // Keep the menu visible but show error
            return
        }
        
        // Request notification permissions
        requestNotificationPermissions()
        
        // Auto-start server
        startServer()
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        stopServer()
        releaseSingleInstanceLock()
    }
    
    // MARK: - Single Instance Lock
    private var lockFileHandle: FileHandle?
    private var lockFilePath: String {
        return NSTemporaryDirectory() + "widgetizer.lock"
    }
    
    private func acquireSingleInstanceLock() -> Bool {
        // Create lock file if it doesn't exist
        FileManager.default.createFile(atPath: lockFilePath, contents: nil, attributes: nil)
        
        guard let handle = FileHandle(forWritingAtPath: lockFilePath) else {
            return false
        }
        
        // Try to acquire exclusive lock
        let result = flock(handle.fileDescriptor, LOCK_EX | LOCK_NB)
        if result == 0 {
            lockFileHandle = handle
            return true
        }
        
        return false
    }
    
    private func releaseSingleInstanceLock() {
        if let handle = lockFileHandle {
            flock(handle.fileDescriptor, LOCK_UN)
            handle.closeFile()
        }
        try? FileManager.default.removeItem(atPath: lockFilePath)
    }
    
    // MARK: - Setup
    private func setupPaths() {
        // Get the app bundle path
        let bundlePath = Bundle.main.bundlePath
        
        // The app is in: widgetizer-vX.X.X/WidgetizerMenu.app
        // So parent is the main app folder
        appPath = (bundlePath as NSString).deletingLastPathComponent
        nodePath = (appPath as NSString).appendingPathComponent("bin/node/node")
        serverPath = (appPath as NSString).appendingPathComponent("server/index.js")
    }
    
    private func validateInstallation() -> Bool {
        let fileManager = FileManager.default
        
        if !fileManager.fileExists(atPath: nodePath) {
            print("Node.js not found at: \(nodePath ?? "nil")")
            showAlert(
                title: "Missing Node.js",
                message: "Node.js not found at:\n\(nodePath ?? "unknown")\n\nPlease ensure Widgetizer is properly installed.",
                style: .critical
            )
            return false
        }
        
        if !fileManager.fileExists(atPath: serverPath) {
            print("Server not found at: \(serverPath ?? "nil")")
            showAlert(
                title: "Missing Files",
                message: "Server files not found at:\n\(serverPath ?? "unknown")\n\nPlease ensure Widgetizer is properly installed.",
                style: .critical
            )
            return false
        }
        
        return true
    }
    
    private func requestNotificationPermissions() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }
    
    // MARK: - Menu Bar Setup
    private func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        
        if let button = statusItem.button {
            // Try to load custom icon from bundle resources
            if let iconPath = Bundle.main.path(forResource: "icon", ofType: "png"),
               let image = NSImage(contentsOfFile: iconPath) {
                image.size = NSSize(width: 18, height: 18)
                image.isTemplate = true
                button.image = image
            } else if #available(macOS 11.0, *),
                      let image = NSImage(systemSymbolName: "square.grid.2x2", accessibilityDescription: "Widgetizer") {
                // Use SF Symbol as fallback (macOS 11+)
                button.image = image
            } else {
                // Ultimate fallback: text
                button.title = "W"
            }
            button.toolTip = "Widgetizer"
        }
        
        // Create menu
        let menu = NSMenu()
        
        let openItem = NSMenuItem(title: "Open Widgetizer", action: #selector(openBrowser), keyEquivalent: "o")
        openItem.target = self
        menu.addItem(openItem)
        
        menu.addItem(NSMenuItem.separator())
        
        let restartItem = NSMenuItem(title: "Restart Server", action: #selector(restartServer), keyEquivalent: "r")
        restartItem.target = self
        menu.addItem(restartItem)
        
        menu.addItem(NSMenuItem.separator())
        
        let quitItem = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
        
        statusItem.menu = menu
    }
    
    // MARK: - Server Management
    private func startServer() {
        // Create .env if it doesn't exist
        let envPath = (appPath as NSString).appendingPathComponent(".env")
        if !FileManager.default.fileExists(atPath: envPath) {
            try? "NODE_ENV=production\nPORT=\(port)\n".write(toFile: envPath, atomically: true, encoding: .utf8)
        }
        
        // Show starting notification
        showNotification(title: "Widgetizer", body: "Starting server, please wait...")
        
        // Start Node.js process
        nodeProcess = Process()
        nodeProcess?.executableURL = URL(fileURLWithPath: nodePath)
        nodeProcess?.arguments = [serverPath]
        nodeProcess?.currentDirectoryURL = URL(fileURLWithPath: appPath)
        
        // Capture output (optional, for debugging)
        let pipe = Pipe()
        nodeProcess?.standardOutput = pipe
        nodeProcess?.standardError = pipe
        
        do {
            try nodeProcess?.run()
            
            // Wait for server to be ready
            DispatchQueue.global(qos: .background).async { [weak self] in
                let ready = self?.waitForServer() ?? false
                
                DispatchQueue.main.async {
                    if ready {
                        self?.showNotification(title: "Widgetizer", body: "Server is ready!")
                        
                        // Small delay so user sees the notification
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                            self?.openBrowser()
                        }
                    } else {
                        self?.showNotification(
                            title: "Widgetizer",
                            body: "Server is taking longer than usual. You can open it manually from the menu bar."
                        )
                    }
                }
            }
        } catch {
            showAlert(
                title: "Error",
                message: "Failed to start server:\n\n\(error.localizedDescription)",
                style: .critical
            )
        }
    }
    
    private func waitForServer() -> Bool {
        // Try for up to 15 seconds
        for _ in 0..<30 {
            Thread.sleep(forTimeInterval: 0.5)
            
            if isServerReady() {
                return true
            }
        }
        return false
    }
    
    private func isServerReady() -> Bool {
        guard let url = URL(string: "http://localhost:\(port)") else { return false }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = 1.0
        
        let semaphore = DispatchSemaphore(value: 0)
        var success = false
        
        let task = URLSession.shared.dataTask(with: request) { _, response, _ in
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                success = true
            }
            semaphore.signal()
        }
        task.resume()
        
        _ = semaphore.wait(timeout: .now() + 2.0)
        return success
    }
    
    private func stopServer() {
        if let process = nodeProcess, process.isRunning {
            process.terminate()
            process.waitUntilExit()
        }
        nodeProcess = nil
    }
    
    // MARK: - Actions
    @objc private func openBrowser() {
        guard let url = URL(string: "http://localhost:\(port)") else { return }
        NSWorkspace.shared.open(url)
    }
    
    @objc private func restartServer() {
        showNotification(title: "Widgetizer", body: "Restarting server...")
        stopServer()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.startServer()
        }
    }
    
    @objc private func quit() {
        NSApp.terminate(nil)
    }
    
    // MARK: - Notifications
    private func showNotification(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Notification error: \(error)")
            }
        }
    }
    
    // Allow notifications to show when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
    
    // MARK: - Alerts
    private func showAlert(title: String, message: String, style: NSAlert.Style) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = style
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

// MARK: - Main Entry Point
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate

// Activate the app to be able to show in menu bar
app.setActivationPolicy(.accessory)

app.run()
