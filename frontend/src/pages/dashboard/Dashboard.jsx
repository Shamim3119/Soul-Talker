import '../../styles/dashboard.css';

const Dashboard = () => {
    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Welcome to Soul Talker HRM</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h3>Employees</h3>
                    <p>Employee information and management</p>
                </div>

                <div className="dashboard-card">
                    <h3>Attendance</h3>
                    <p>Attendance monitoring and management</p>
                </div>

                <div className="dashboard-card">
                    <h3>Leave</h3>
                    <p>Leave requests and management</p>
                </div>

                <div className="dashboard-card">
                    <h3>Payroll</h3>
                    <p>Payroll processing and management</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;